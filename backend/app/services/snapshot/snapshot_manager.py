import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from app.models.storage_snapshot import StorageSnapshot, SnapshotDelta, HistoricalScanRecord
from app.database.database import get_db
from app.utils.file_utils import format_size

class SnapshotManager:
    """Algorithm 8: Snapshot Creation and Storage Growth Comparison."""

    @staticmethod
    def create_snapshot(
        scan_id: str,
        root_path: str,
        total_inodes: int,
        directory_sizes: Dict[str, int],
        db_path: Optional[Path] = None,
    ) -> StorageSnapshot:
        """
        Record disk storage statistics and directory sizes after completed scan.
        Persists snapshot and directory sizes to SQLite.
        """
        resolved_path = Path(root_path).resolve()
        
        # Query OS disk usage
        try:
            usage = shutil.disk_usage(resolved_path)
            total_storage = usage.total
            used_storage = usage.used
            free_storage = usage.free
        except Exception:
            # Fallback if disk usage query fails on virtual/memory drive
            total_storage = sum(directory_sizes.values())
            used_storage = total_storage
            free_storage = 0

        snapshot_id = f"snap-{uuid.uuid4().hex[:8]}"
        now = datetime.now()

        snapshot = StorageSnapshot(
            id=snapshot_id,
            scan_id=scan_id,
            timestamp=now,
            root_path=str(resolved_path),
            total_storage=total_storage,
            used_storage=used_storage,
            free_storage=free_storage,
            total_inodes=total_inodes,
            directory_sizes=directory_sizes,
        )

        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """
                INSERT INTO snapshots (id, scan_id, timestamp, root_path, total_storage, used_storage, free_storage, total_inodes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot.id,
                    snapshot.scan_id,
                    snapshot.timestamp.isoformat(),
                    snapshot.root_path,
                    snapshot.total_storage,
                    snapshot.used_storage,
                    snapshot.free_storage,
                    snapshot.total_inodes,
                ),
            )

            # Insert directory aggregate sizes
            for d_path, size in directory_sizes.items():
                conn.execute(
                    """
                    INSERT INTO directory_snapshots (id, snapshot_id, directory_path, aggregate_size)
                    VALUES (?, ?, ?, ?)
                    """,
                    (f"ds-{uuid.uuid4().hex[:8]}", snapshot.id, d_path, size),
                )

        return snapshot

    @staticmethod
    def compare_snapshots(
        previous: StorageSnapshot, current: StorageSnapshot
    ) -> List[SnapshotDelta]:
        """
        Algorithm 8: Compare two snapshots and calculate directory growth/reduction.
        Returns list of SnapshotDelta sorted by absolute delta descending.
        """
        prev_map = previous.directory_sizes
        curr_map = current.directory_sizes

        all_paths = set(prev_map.keys()) | set(curr_map.keys())
        deltas: List[SnapshotDelta] = []

        for p in all_paths:
            old_size = prev_map.get(p, 0)
            new_size = curr_map.get(p, 0)
            delta_bytes = new_size - old_size

            if delta_bytes == 0:
                continue

            is_positive = delta_bytes > 0
            direction = "EXPANDED" if is_positive else "CONTRACTED"
            sign = "+ " if is_positive else "- "
            delta_formatted = f"{sign}{format_size(abs(delta_bytes))}"

            # Format directory name for display (e.g. DOWNLOADS/)
            dir_name = Path(p).name.upper()
            if not dir_name.endswith("/"):
                dir_name += "/"

            deltas.append(
                SnapshotDelta(
                    directory=dir_name,
                    delta_bytes=delta_bytes,
                    delta=delta_formatted,
                    direction=direction,
                    is_positive=is_positive,
                )
            )

        # Sort descending by absolute delta
        deltas.sort(key=lambda d: abs(d.delta_bytes), reverse=True)
        return deltas

    @staticmethod
    def get_historical_scans(db_path: Optional[Path] = None) -> List[HistoricalScanRecord]:
        """Retrieve all completed scans formatted for history table."""
        kwargs = {"db_path": db_path} if db_path else {}
        results = []
        with get_db(**kwargs) as conn:
            rows = conn.execute(
                """
                SELECT id, scan_id, timestamp, root_path, total_inodes, total_storage, used_storage
                FROM snapshots
                ORDER BY timestamp DESC
                """
            ).fetchall()

            for r in rows:
                dt = datetime.fromisoformat(r["timestamp"])
                formatted_date = dt.strftime("%d %b %Y %H:%M").upper()
                results.append(
                    HistoricalScanRecord(
                        id=r["id"],
                        scan_id=r["scan_id"],
                        date=formatted_date,
                        root_target=r["root_path"],
                        inodes=f"{r['total_inodes']:,}",
                        total=format_size(r["used_storage"]),
                        status="[COMPLETED]",
                    )
                )
        return results

    @staticmethod
    def get_latest_deltas(db_path: Optional[Path] = None) -> List[SnapshotDelta]:
        """Compare the two most recent snapshots to produce directory growth deltas."""
        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            snap_rows = conn.execute(
                """
                SELECT id, scan_id, timestamp, root_path, total_storage, used_storage, free_storage, total_inodes
                FROM snapshots
                ORDER BY timestamp DESC
                LIMIT 2
                """
            ).fetchall()

            if len(snap_rows) < 2:
                # If only one snapshot or none, return empty or fallback
                return []

            curr_row = snap_rows[0]
            prev_row = snap_rows[1]

            def _get_dir_sizes(snap_id: str) -> Dict[str, int]:
                dir_rows = conn.execute(
                    "SELECT directory_path, aggregate_size FROM directory_snapshots WHERE snapshot_id = ?",
                    (snap_id,),
                ).fetchall()
                return {row["directory_path"]: row["aggregate_size"] for row in dir_rows}

            curr_snapshot = StorageSnapshot(
                id=curr_row["id"],
                scan_id=curr_row["scan_id"],
                timestamp=datetime.fromisoformat(curr_row["timestamp"]),
                root_path=curr_row["root_path"],
                total_storage=curr_row["total_storage"],
                used_storage=curr_row["used_storage"],
                free_storage=curr_row["free_storage"],
                total_inodes=curr_row["total_inodes"],
                directory_sizes=_get_dir_sizes(curr_row["id"]),
            )

            prev_snapshot = StorageSnapshot(
                id=prev_row["id"],
                scan_id=prev_row["scan_id"],
                timestamp=datetime.fromisoformat(prev_row["timestamp"]),
                root_path=prev_row["root_path"],
                total_storage=prev_row["total_storage"],
                used_storage=prev_row["used_storage"],
                free_storage=prev_row["free_storage"],
                total_inodes=prev_row["total_inodes"],
                directory_sizes=_get_dir_sizes(prev_row["id"]),
            )

            return SnapshotManager.compare_snapshots(prev_snapshot, curr_snapshot)
