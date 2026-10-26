import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from app.models.cleanup_result import CleanupResultItem
from app.services.cleanup.trash_manager import TrashManager
from app.services.cleanup.recovery_manager import RecoveryManager
from app.database.database import get_db

class CleanupManager:
    """Algorithm 10: Safe Cleanup and Lossless Restore Execution."""

    def __init__(self, recovery_manager: Optional[RecoveryManager] = None):
        self.recovery_manager = recovery_manager or RecoveryManager()

    def validate_target(self, filepath: Path, expected_size: Optional[int] = None) -> Tuple[bool, str]:
        """Verify target exists and has not mutated since analysis."""
        if not filepath.exists():
            return False, f"Target file '{filepath}' no longer exists."
        if not filepath.is_file():
            return False, f"Target '{filepath}' is not a regular file."
        if expected_size is not None:
            actual_size = filepath.stat().st_size
            if actual_size != expected_size:
                return False, f"File size mutated from {expected_size} to {actual_size} bytes."
        return True, "Valid"

    def execute_safe_cleanup(
        self,
        targets: List[Dict[str, Any]],
        prefer_trash: bool = True,
        db_path: Optional[Path] = None,
    ) -> List[CleanupResultItem]:
        """
        Execute reversible cleanup on user-approved candidate targets.
        Files are moved to OS Recycle Bin or quarantined in local recovery vault.
        """
        results: List[CleanupResultItem] = []
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for target in targets:
            path_str = target.get("targetPath") or target.get("path")
            expected_size = target.get("bytes")
            file_path = Path(path_str)
            filename = file_path.name

            # Pre-flight safety validation
            is_valid, validation_msg = self.validate_target(file_path, expected_size)
            if not is_valid:
                res = CleanupResultItem(
                    id=f"rc-{uuid.uuid4().hex[:8]}",
                    dispatch_id=f"#RC-{uuid.uuid4().hex[:4].upper()}",
                    filename=filename,
                    size_bytes=expected_size or 0,
                    origin_path=path_str,
                    status=f"FAILED ({validation_msg})",
                    location="N/A",
                    timestamp=now_str,
                    is_restored=False,
                    error=validation_msg,
                )
                results.append(res)
                self._persist_cleanup_result(res, db_path=db_path)
                continue

            file_size = file_path.stat().st_size
            dispatch_id = f"#RC-{uuid.uuid4().hex[:4].upper()}"
            result_id = f"rc-{uuid.uuid4().hex[:8]}"

            # Attempt 1: OS Recycle Bin
            if prefer_trash and TrashManager.is_available():
                ok, msg = TrashManager.move_to_trash(file_path)
                if ok:
                    res = CleanupResultItem(
                        id=result_id,
                        dispatch_id=dispatch_id,
                        filename=filename,
                        size_bytes=file_size,
                        origin_path=str(file_path),
                        status="RECOVERABLE (OS RECYCLE BIN)",
                        location="OS RECYCLE BIN",
                        timestamp=now_str,
                        is_restored=False,
                    )
                    results.append(res)
                    self._persist_cleanup_result(res, db_path=db_path)
                    continue

            # Attempt 2: Local Recovery Vault
            ok_vault, vault_msg, vault_path = self.recovery_manager.move_to_vault(file_path)
            if ok_vault:
                res = CleanupResultItem(
                    id=result_id,
                    dispatch_id=dispatch_id,
                    filename=filename,
                    size_bytes=file_size,
                    origin_path=str(file_path),
                    status="RECOVERABLE (RECOVERY VAULT)",
                    location="LOCAL RECOVERY VAULT",
                    timestamp=now_str,
                    is_restored=False,
                    recovery_path=vault_path,
                )
            else:
                res = CleanupResultItem(
                    id=result_id,
                    dispatch_id=dispatch_id,
                    filename=filename,
                    size_bytes=file_size,
                    origin_path=str(file_path),
                    status=f"FAILED ({vault_msg})",
                    location="N/A",
                    timestamp=now_str,
                    is_restored=False,
                    error=vault_msg,
                )

            results.append(res)
            self._persist_cleanup_result(res, db_path=db_path)

        return results

    def restore_file(self, result_id: str, db_path: Optional[Path] = None) -> Tuple[bool, str]:
        """Restore quarantined file back to original location."""
        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            row = conn.execute("SELECT * FROM cleanup_results WHERE id = ?", (result_id,)).fetchone()
            if not row:
                return False, f"Cleanup record '{result_id}' not found."

            if row["is_restored"]:
                return False, "File is already restored."

            recovery_path = row["recovery_path"]
            origin_path = row["origin_path"]

            if not recovery_path or not Path(recovery_path).exists():
                # If was moved to OS Recycle Bin, notify user
                if row["location"] == "OS RECYCLE BIN":
                    return False, "File is in OS Recycle Bin; restore via your system Recycle Bin / Trash."
                return False, "Quarantined recovery copy not found on disk."

            ok, msg = self.recovery_manager.restore_from_vault(recovery_path, origin_path)
            if ok:
                conn.execute(
                    """
                    UPDATE cleanup_results
                    SET is_restored = 1, status = ?, location = 'ORIGINAL DIRECTORY'
                    WHERE id = ?
                    """,
                    (f"RESTORED (MOVED TO {origin_path})", result_id),
                )
                return True, msg
            return False, msg

    def get_recovery_log(self, db_path: Optional[Path] = None) -> List[CleanupResultItem]:
        """Retrieve audit log of all cleanup and recovery actions."""
        kwargs = {"db_path": db_path} if db_path else {}
        results = []
        with get_db(**kwargs) as conn:
            rows = conn.execute(
                "SELECT * FROM cleanup_results ORDER BY timestamp DESC"
            ).fetchall()
            for r in rows:
                results.append(
                    CleanupResultItem(
                        id=r["id"],
                        dispatch_id=r["dispatch_id"],
                        filename=r["filename"],
                        size_bytes=r["size_bytes"],
                        origin_path=r["origin_path"],
                        status=r["status"],
                        location=r["location"],
                        timestamp=r["timestamp"],
                        is_restored=bool(r["is_restored"]),
                        recovery_path=r["recovery_path"],
                        error=r["error"],
                    )
                )
        return results

    def _persist_cleanup_result(self, item: CleanupResultItem, db_path: Optional[Path] = None) -> None:
        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO cleanup_results (id, dispatch_id, filename, origin_path, size_bytes, action, status, location, timestamp, is_restored, recovery_path, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.id,
                    item.dispatch_id,
                    item.filename,
                    item.origin_path,
                    item.size_bytes,
                    "TRASH" if "RECYCLE BIN" in item.location else "RECOVERY_VAULT",
                    item.status,
                    item.location,
                    item.timestamp,
                    1 if item.is_restored else 0,
                    item.recovery_path,
                    item.error,
                ),
            )
