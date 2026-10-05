import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.database.database import get_db
from app.models.file_node import FileNode
from app.models.scan_session import ScanSession, ScanReport
from app.models.duplicate_group import DuplicateGroup
from app.models.similar_image_group import SimilarImageCluster

class ScanRepository:
    """Persistence operations for ScanSessions and associated analysis artifacts."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path

    def create_session(self, session: ScanSession) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """
                INSERT INTO scan_sessions (id, root_path, start_time, status, total_files, total_directories, total_size, error_count, scan_options)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session.id,
                    session.root_path,
                    session.start_time.isoformat(),
                    session.status,
                    session.total_files,
                    session.total_directories,
                    session.total_size,
                    session.error_count,
                    json.dumps(session.scan_options),
                ),
            )

    def update_session(self, session: ScanSession) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """
                UPDATE scan_sessions
                SET end_time = ?, status = ?, total_files = ?, total_directories = ?, total_size = ?, error_count = ?
                WHERE id = ?
                """,
                (
                    session.end_time.isoformat() if session.end_time else None,
                    session.status,
                    session.total_files,
                    session.total_directories,
                    session.total_size,
                    session.error_count,
                    session.id,
                ),
            )

    def get_session(self, scan_id: str) -> Optional[ScanSession]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            row = conn.execute("SELECT * FROM scan_sessions WHERE id = ?", (scan_id,)).fetchone()
            if not row:
                return None
            return ScanSession(
                id=row["id"],
                root_path=row["root_path"],
                start_time=datetime.fromisoformat(row["start_time"]),
                end_time=datetime.fromisoformat(row["end_time"]) if row["end_time"] else None,
                status=row["status"],
                total_files=row["total_files"],
                total_directories=row["total_directories"],
                total_size=row["total_size"],
                error_count=row["error_count"],
                scan_options=json.loads(row["scan_options"]) if row["scan_options"] else {},
            )

    def save_files_and_directories(
        self, scan_id: str, files: List[FileNode], directories: List[FileNode]
    ) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for f in files:
                conn.execute(
                    """
                    INSERT INTO files (id, scan_id, path, name, extension, size, created_at, modified_at, accessed_at, is_directory, is_hidden, error)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                    """,
                    (
                        f.id,
                        scan_id,
                        f.path,
                        f.name,
                        f.extension,
                        f.size,
                        f.created_at.isoformat() if f.created_at else None,
                        f.modified_at.isoformat() if f.modified_at else None,
                        f.accessed_at.isoformat() if f.accessed_at else None,
                        1 if f.is_hidden else 0,
                        f.error,
                    ),
                )

            for d in directories:
                conn.execute(
                    """
                    INSERT INTO directories (id, scan_id, path, aggregate_size, file_count, dir_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        d.id,
                        scan_id,
                        d.path,
                        d.aggregate_size,
                        len([c for c in d.children if not c.is_directory]),
                        len([c for c in d.children if c.is_directory]),
                    ),
                )

    def save_duplicate_groups(self, scan_id: str, groups: List[DuplicateGroup]) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for g in groups:
                conn.execute(
                    """
                    INSERT INTO duplicate_groups (id, scan_id, content_hash, short_hash, sector_name, match_count, total_size, hex_sample)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        g.id,
                        scan_id,
                        g.hash,
                        g.short_hash,
                        g.sector_name,
                        g.match_count,
                        g.total_bytes,
                        json.dumps(g.hex_sample),
                    ),
                )
                for f in g.files:
                    conn.execute(
                        """
                        INSERT INTO duplicate_files (id, group_id, scan_id, file_id, name, path, size, resolution, is_preferred, status, status_desc, rationale)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f.id,
                            g.id,
                            scan_id,
                            f.id,
                            f.name,
                            f.path,
                            f.size,
                            f.resolution,
                            1 if f.is_preferred else 0,
                            f.status,
                            f.status_desc,
                            f.rationale,
                        ),
                    )

    def save_similar_image_clusters(
        self, scan_id: str, clusters: List[SimilarImageCluster]
    ) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for cl in clusters:
                conn.execute(
                    """
                    INSERT INTO similar_image_groups (id, scan_id, label, match_count)
                    VALUES (?, ?, ?, ?)
                    """,
                    (cl.id, scan_id, cl.label, cl.match_count),
                )
                for img in cl.images:
                    conn.execute(
                        """
                        INSERT INTO similar_image_files (id, group_id, scan_id, filename, path, dimensions, p_hash, hamming_distance, similarity, is_reference, badge, sector_label, overlay_type, overlay_detail)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            img.id,
                            cl.id,
                            scan_id,
                            img.filename,
                            img.path,
                            img.dimensions,
                            img.p_hash,
                            img.hamming_distance,
                            img.similarity,
                            1 if img.is_reference else 0,
                            img.badge,
                            img.sector_label,
                            img.overlay_type,
                            img.overlay_detail,
                        ),
                    )
