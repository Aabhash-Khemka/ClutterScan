import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.database.database import get_db
from app.models.file_node import FileNode
from app.models.scan_session import ScanSession, ScanReport
from app.models.duplicate_group import DuplicateGroup, DuplicateFileItem
from app.models.similar_image_group import SimilarImageCluster, PerceptualImageItem
from app.models.cleanup_recommendation import CleanupRecommendation
from app.services.scanner.tree_builder import TreeBuilder

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

    def get_latest_session(self) -> Optional[ScanSession]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            row = conn.execute("SELECT * FROM scan_sessions ORDER BY start_time DESC LIMIT 1").fetchone()
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

    def get_all_sessions(self) -> List[ScanSession]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            rows = conn.execute("SELECT * FROM scan_sessions ORDER BY start_time DESC").fetchall()
            sessions = []
            for row in rows:
                sessions.append(
                    ScanSession(
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
                )
            return sessions

    def save_files_and_directories(
        self, scan_id: str, files: List[FileNode], directories: List[FileNode]
    ) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for f in files:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO files (id, scan_id, path, name, extension, size, created_at, modified_at, accessed_at, is_directory, is_hidden, error)
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
                    INSERT OR REPLACE INTO directories (id, scan_id, path, aggregate_size, file_count, dir_count)
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

    def get_files(self, scan_id: str) -> List[FileNode]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            rows = conn.execute("SELECT * FROM files WHERE scan_id = ?", (scan_id,)).fetchall()
            nodes = []
            for r in rows:
                nodes.append(
                    FileNode(
                        id=r["id"],
                        name=r["name"],
                        path=r["path"],
                        extension=r["extension"] or "",
                        size=r["size"],
                        aggregate_size=r["size"],
                        is_directory=bool(r["is_directory"]),
                        is_hidden=bool(r["is_hidden"]),
                        created_at=datetime.fromisoformat(r["created_at"]) if r["created_at"] else None,
                        modified_at=datetime.fromisoformat(r["modified_at"]) if r["modified_at"] else None,
                        accessed_at=datetime.fromisoformat(r["accessed_at"]) if r["accessed_at"] else None,
                        content_hash=r["content_hash"],
                        p_hash=r["p_hash"],
                        width=r["width"],
                        height=r["height"],
                        is_old=bool(r["is_old"]),
                        is_temp=bool(r["is_temp"]),
                        error=r["error"],
                    )
                )
            return nodes

    def save_duplicate_groups(self, scan_id: str, groups: List[DuplicateGroup]) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for g in groups:
                group_pk = f"{scan_id}_{g.id}"
                conn.execute(
                    """
                    INSERT OR REPLACE INTO duplicate_groups (id, scan_id, content_hash, short_hash, sector_name, match_count, total_size, hex_sample)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        group_pk,
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
                    file_pk = f"{scan_id}_{f.id}"
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO duplicate_files (id, group_id, scan_id, file_id, name, path, size, resolution, is_preferred, status, status_desc, rationale)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            file_pk,
                            group_pk,
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

    def get_duplicate_groups(self, scan_id: str) -> List[DuplicateGroup]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        groups = []
        with get_db(**kwargs) as conn:
            group_rows = conn.execute(
                "SELECT * FROM duplicate_groups WHERE scan_id = ?", (scan_id,)
            ).fetchall()
            for g_row in group_rows:
                file_rows = conn.execute(
                    "SELECT * FROM duplicate_files WHERE group_id = ? AND scan_id = ?",
                    (g_row["id"], scan_id),
                ).fetchall()
                files = []
                for f_row in file_rows:
                    orig_f_id = f_row["file_id"] or f_row["id"].replace(f"{scan_id}_", "")
                    files.append(
                        DuplicateFileItem(
                            id=orig_f_id,
                            name=f_row["name"],
                            path=f_row["path"],
                            size=f_row["size"],
                            content_hash=g_row["content_hash"],
                            resolution=f_row["resolution"] or "N/A",
                            is_preferred=bool(f_row["is_preferred"]),
                            status=f_row["status"] or "CLEANUP CANDIDATE",
                            status_desc=f_row["status_desc"] or "",
                            rationale=f_row["rationale"] or "",
                        )
                    )
                hex_sample = json.loads(g_row["hex_sample"]) if g_row["hex_sample"] else []
                orig_g_id = g_row["id"].replace(f"{scan_id}_", "")
                groups.append(
                    DuplicateGroup(
                        id=orig_g_id,
                        sector_name=g_row["sector_name"],
                        hash=g_row["content_hash"],
                        short_hash=g_row["short_hash"],
                        match_count=g_row["match_count"],
                        total_bytes=g_row["total_size"],
                        files=files,
                        hex_sample=hex_sample,
                    )
                )
        return groups

    def save_similar_image_clusters(
        self, scan_id: str, clusters: List[SimilarImageCluster]
    ) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for cl in clusters:
                cluster_pk = f"{scan_id}_{cl.id}"
                conn.execute(
                    """
                    INSERT OR REPLACE INTO similar_image_groups (id, scan_id, label, match_count)
                    VALUES (?, ?, ?, ?)
                    """,
                    (cluster_pk, scan_id, cl.label, cl.match_count),
                )
                for img in cl.images:
                    img_pk = f"{scan_id}_{img.id}"
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO similar_image_files (id, group_id, scan_id, filename, path, dimensions, p_hash, hamming_distance, similarity, is_reference, badge, sector_label, overlay_type, overlay_detail)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            img_pk,
                            cluster_pk,
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

    def get_similar_image_clusters(self, scan_id: str) -> List[SimilarImageCluster]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        clusters = []
        with get_db(**kwargs) as conn:
            c_rows = conn.execute(
                "SELECT * FROM similar_image_groups WHERE scan_id = ?", (scan_id,)
            ).fetchall()
            for c_row in c_rows:
                img_rows = conn.execute(
                    "SELECT * FROM similar_image_files WHERE group_id = ? AND scan_id = ?",
                    (c_row["id"], scan_id),
                ).fetchall()
                images = []
                for i_row in img_rows:
                    orig_img_id = i_row["id"].replace(f"{scan_id}_", "")
                    images.append(
                        PerceptualImageItem(
                            id=orig_img_id,
                            filename=i_row["filename"],
                            path=i_row["path"],
                            dimensions=i_row["dimensions"] or "N/A",
                            p_hash=i_row["p_hash"] or "",
                            hamming_distance=i_row["hamming_distance"] or 0,
                            similarity=i_row["similarity"] or "100.0%",
                            is_reference=bool(i_row["is_reference"]),
                            badge=i_row["badge"] or "REFERENCE",
                            sector_label=i_row["sector_label"] or "",
                            overlay_type=i_row["overlay_type"] or "[RAW_OPTICAL_FRAME]",
                            overlay_detail=i_row["overlay_detail"] or "",
                        )
                    )
                orig_cl_id = c_row["id"].replace(f"{scan_id}_", "")
                clusters.append(
                    SimilarImageCluster(
                        id=orig_cl_id,
                        label=c_row["label"],
                        match_count=c_row["match_count"],
                        images=images,
                    )
                )
        return clusters

    def save_recommendations(
        self, scan_id: str, recommendations: List[CleanupRecommendation]
    ) -> None:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            for r in recommendations:
                rec_pk = f"{scan_id}_{r.id}"
                conn.execute(
                    """
                    INSERT OR REPLACE INTO recommendations (id, scan_id, rank_label, target_path, score, reasons, recoverable_bytes, is_selected)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rec_pk,
                        scan_id,
                        r.rank,
                        r.target_path,
                        r.impact_score,
                        json.dumps(r.reasons),
                        r.bytes,
                        1 if r.is_selected else 0,
                    ),
                )

    def get_recommendations(self, scan_id: str) -> List[CleanupRecommendation]:
        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            rows = conn.execute(
                "SELECT * FROM recommendations WHERE scan_id = ? ORDER BY score DESC", (scan_id,)
            ).fetchall()
            recs = []
            for r in rows:
                reasons = json.loads(r["reasons"]) if r["reasons"] else []
                orig_id = r["id"].replace(f"{scan_id}_", "")
                recs.append(
                    CleanupRecommendation(
                        id=orig_id,
                        rank=r["rank_label"],
                        impact_score=r["score"],
                        target_path=r["target_path"],
                        reasons=reasons,
                        bytes=r["recoverable_bytes"],
                        is_selected=bool(r["is_selected"]),
                    )
                )
            return recs

    def get_tree(self, scan_id: str) -> Optional[FileNode]:
        """Reconstruct N-ary filesystem tree from persisted directory and file records."""
        session = self.get_session(scan_id)
        if not session:
            return None

        kwargs = {"db_path": self.db_path} if self.db_path else {}
        with get_db(**kwargs) as conn:
            dir_rows = conn.execute(
                "SELECT * FROM directories WHERE scan_id = ?", (scan_id,)
            ).fetchall()
            file_rows = conn.execute(
                "SELECT * FROM files WHERE scan_id = ?", (scan_id,)
            ).fetchall()

        if not dir_rows and not file_rows:
            return None

        # Build directory nodes keyed by normalized path
        dir_nodes: Dict[str, FileNode] = {}
        for d in dir_rows:
            p = str(Path(d["path"]))
            dir_nodes[p] = FileNode(
                id=d["id"],
                name=Path(d["path"]).name or d["path"],
                path=d["path"],
                is_directory=True,
                aggregate_size=d["aggregate_size"],
            )

        root_path = str(Path(session.root_path))
        if root_path not in dir_nodes:
            dir_nodes[root_path] = FileNode(
                id=f"dir-root-{scan_id}",
                name=Path(root_path).name or root_path,
                path=root_path,
                is_directory=True,
                aggregate_size=session.total_size,
            )

        # Attach child directories to parent directories
        for p, d_node in list(dir_nodes.items()):
            if p == root_path:
                continue
            parent_p = str(Path(p).parent)
            if parent_p in dir_nodes and d_node not in dir_nodes[parent_p].children:
                dir_nodes[parent_p].children.append(d_node)

        # Attach files to their parent directory
        for f in file_rows:
            f_path = str(Path(f["path"]))
            parent_p = str(Path(f_path).parent)
            file_node = FileNode(
                id=f["id"],
                name=f["name"],
                path=f["path"],
                extension=f["extension"] or "",
                size=f["size"],
                aggregate_size=f["size"],
                is_directory=False,
            )
            if parent_p in dir_nodes:
                dir_nodes[parent_p].children.append(file_node)
            elif root_path in dir_nodes:
                dir_nodes[root_path].children.append(file_node)

        root_node = dir_nodes.get(root_path)
        if root_node:
            TreeBuilder.calculate_size(root_node)
        return root_node

