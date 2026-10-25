"""
Safe File Executor for Smart Organize.
Executes approved planned moves with pre-flight validation,
conflict re-checking, and per-file result recording.
"""
import shutil
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.database.database import get_db
from app.services.organize.planner import PlannedMove


@dataclass
class MoveResult:
    id: str
    operation_id: str
    filename: str
    source_path: str
    dest_path: str
    category: str
    rule_reason: str
    size_bytes: int
    status: str        # moved | skipped | failed
    error: str = ""
    dest_created: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "operationId": self.operation_id,
            "filename": self.filename,
            "sourcePath": self.source_path,
            "destPath": self.dest_path,
            "category": self.category,
            "ruleReason": self.rule_reason,
            "sizeBytes": self.size_bytes,
            "status": self.status,
            "error": self.error,
            "destCreated": self.dest_created,
        }


@dataclass
class ExecutionSummary:
    operation_id: str
    source_folder: str
    created_at: str
    status: str
    total_moved: int = 0
    total_skipped: int = 0
    total_failed: int = 0
    results: List[MoveResult] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "operationId": self.operation_id,
            "sourceFolder": self.source_folder,
            "createdAt": self.created_at,
            "status": self.status,
            "totalMoved": self.total_moved,
            "totalSkipped": self.total_skipped,
            "totalFailed": self.total_failed,
            "results": [r.to_dict() for r in self.results],
        }


class OrganizeExecutor:
    """Executes an approved list of planned moves safely."""

    def execute(
        self,
        source_folder: str,
        approved_moves: List[PlannedMove],
        db_path=None,
    ) -> ExecutionSummary:
        operation_id = f"org-{uuid.uuid4().hex[:12]}"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        summary = ExecutionSummary(
            operation_id=operation_id,
            source_folder=source_folder,
            created_at=now,
            status="running",
        )

        # Persist operation record first
        self._persist_operation(summary, len(approved_moves), db_path)

        for move in approved_moves:
            if move.status != "ready":
                result = MoveResult(
                    id=f"mr-{uuid.uuid4().hex[:8]}",
                    operation_id=operation_id,
                    filename=move.filename,
                    source_path=move.source_path,
                    dest_path=move.dest_path,
                    category=move.category,
                    rule_reason=move.rule_reason,
                    size_bytes=move.size_bytes,
                    status="skipped",
                    error=f"Status was '{move.status}' before execution",
                )
                summary.total_skipped += 1
                summary.results.append(result)
                self._persist_file_result(result, db_path)
                continue

            result = self._move_one(move, operation_id)
            if result.status == "moved":
                summary.total_moved += 1
            elif result.status == "skipped":
                summary.total_skipped += 1
            else:
                summary.total_failed += 1
            summary.results.append(result)
            self._persist_file_result(result, db_path)

        if summary.total_failed == 0 and summary.total_moved > 0:
            summary.status = "completed"
        elif summary.total_failed > 0 and summary.total_moved > 0:
            summary.status = "partial"
        elif summary.total_moved == 0:
            summary.status = "failed"
        else:
            summary.status = "completed"

        self._update_operation_status(summary, db_path)
        return summary

    def _move_one(self, move: PlannedMove, operation_id: str) -> MoveResult:
        result_id = f"mr-{uuid.uuid4().hex[:8]}"
        src = Path(move.source_path)
        dst = Path(move.dest_path)

        # Pre-flight checks
        if not src.exists():
            return MoveResult(
                id=result_id, operation_id=operation_id,
                filename=move.filename, source_path=move.source_path,
                dest_path=move.dest_path, category=move.category,
                rule_reason=move.rule_reason, size_bytes=move.size_bytes,
                status="skipped", error="Source file no longer exists."
            )
        if not src.is_file():
            return MoveResult(
                id=result_id, operation_id=operation_id,
                filename=move.filename, source_path=move.source_path,
                dest_path=move.dest_path, category=move.category,
                rule_reason=move.rule_reason, size_bytes=move.size_bytes,
                status="skipped", error="Source is not a regular file."
            )
        # Re-check conflict at destination
        if dst.exists():
            return MoveResult(
                id=result_id, operation_id=operation_id,
                filename=move.filename, source_path=move.source_path,
                dest_path=move.dest_path, category=move.category,
                rule_reason=move.rule_reason, size_bytes=move.size_bytes,
                status="skipped",
                error=f"Destination already exists — will not overwrite: {dst}"
            )

        # Create destination directory if needed
        dest_created = False
        try:
            if not dst.parent.exists():
                dst.parent.mkdir(parents=True, exist_ok=True)
                dest_created = True
            shutil.move(str(src), str(dst))
            return MoveResult(
                id=result_id, operation_id=operation_id,
                filename=move.filename, source_path=move.source_path,
                dest_path=move.dest_path, category=move.category,
                rule_reason=move.rule_reason, size_bytes=move.size_bytes,
                status="moved", dest_created=dest_created,
            )
        except Exception as exc:
            return MoveResult(
                id=result_id, operation_id=operation_id,
                filename=move.filename, source_path=move.source_path,
                dest_path=move.dest_path, category=move.category,
                rule_reason=move.rule_reason, size_bytes=move.size_bytes,
                status="failed", error=str(exc),
            )

    def undo_operation(self, operation_id: str, db_path=None) -> dict:
        """Restore all successfully moved files to their original locations."""
        kwargs = {"db_path": db_path} if db_path else {}
        restored = 0
        skipped = 0
        failed = 0

        with get_db(**kwargs) as conn:
            op = conn.execute(
                "SELECT * FROM organize_operations WHERE id=?", (operation_id,)
            ).fetchone()
            if not op:
                return {"success": False, "message": "Operation not found."}
            if op["undo_status"] == "undone":
                return {"success": False, "message": "Operation already undone."}

            rows = conn.execute(
                "SELECT * FROM organize_files WHERE operation_id=? AND status='moved'",
                (operation_id,),
            ).fetchall()

            for row in rows:
                src = Path(row["dest_path"])    # current location (post-move)
                dst = Path(row["source_path"])  # original location (pre-move)

                if not src.exists():
                    conn.execute(
                        "UPDATE organize_files SET status='undo_skipped', error=? WHERE id=?",
                        ("File not at recorded destination.", row["id"]),
                    )
                    skipped += 1
                    continue

                if dst.exists():
                    conn.execute(
                        "UPDATE organize_files SET status='undo_skipped', error=? WHERE id=?",
                        ("Original path is occupied — will not overwrite.", row["id"]),
                    )
                    skipped += 1
                    continue

                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(src), str(dst))
                    conn.execute(
                        "UPDATE organize_files SET status='restored' WHERE id=?",
                        (row["id"],),
                    )
                    # Attempt to remove empty dest folder created by this operation
                    if row["dest_created"] and src.parent.exists():
                        try:
                            src.parent.rmdir()  # only removes if empty
                        except OSError:
                            pass
                    restored += 1
                except Exception as exc:
                    conn.execute(
                        "UPDATE organize_files SET status='undo_failed', error=? WHERE id=?",
                        (str(exc), row["id"]),
                    )
                    failed += 1

            new_undo = "undone" if failed == 0 and skipped == 0 else "partial"
            conn.execute(
                "UPDATE organize_operations SET undo_status=? WHERE id=?",
                (new_undo, operation_id),
            )

        return {
            "success": True,
            "restored": restored,
            "skipped": skipped,
            "failed": failed,
            "undoStatus": new_undo,
        }

    def _persist_operation(self, summary: ExecutionSummary, total_planned: int, db_path) -> None:
        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO organize_operations
                (id, created_at, source_folder, status, total_planned, total_moved,
                 total_skipped, total_failed, undo_status)
                VALUES (?,?,?,?,?,?,?,?,?)""",
                (summary.operation_id, summary.created_at, summary.source_folder,
                 summary.status, total_planned, 0, 0, 0, "eligible"),
            )

    def _persist_file_result(self, result: MoveResult, db_path) -> None:
        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO organize_files
                (id, operation_id, filename, source_path, dest_path, category,
                 rule_reason, size_bytes, status, error, dest_created)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (result.id, result.operation_id, result.filename, result.source_path,
                 result.dest_path, result.category, result.rule_reason,
                 result.size_bytes, result.status, result.error,
                 1 if result.dest_created else 0),
            )

    def _update_operation_status(self, summary: ExecutionSummary, db_path) -> None:
        kwargs = {"db_path": db_path} if db_path else {}
        with get_db(**kwargs) as conn:
            conn.execute(
                """UPDATE organize_operations
                SET status=?, total_moved=?, total_skipped=?, total_failed=?
                WHERE id=?""",
                (summary.status, summary.total_moved, summary.total_skipped,
                 summary.total_failed, summary.operation_id),
            )
