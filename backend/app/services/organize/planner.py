"""
Organization Plan Generator.
Scans a folder, categorizes each file, builds an OrganizePlan,
detects destination conflicts. Does NOT move files.
"""
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from app.services.organize.categorizer import categorize_file, DEFAULT_COLLEGE_KEYWORDS


@dataclass
class PlannedMove:
    id: str
    filename: str
    source_path: str
    dest_path: str
    category: str
    rule_reason: str
    size_bytes: int
    status: str = "ready"       # ready | excluded | conflict | unsupported
    conflict_note: str = ""
    user_override: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "sourcePath": self.source_path,
            "destPath": self.dest_path,
            "category": self.category,
            "ruleReason": self.rule_reason,
            "sizeBytes": self.size_bytes,
            "status": self.status,
            "conflictNote": self.conflict_note,
            "userOverride": self.user_override,
        }


@dataclass
class OrganizePlan:
    source_folder: str
    planned_moves: List[PlannedMove] = field(default_factory=list)
    skipped_files: int = 0
    error_files: int = 0

    @property
    def moves(self) -> List[PlannedMove]:
        return self.planned_moves

    def to_dict(self) -> dict:
        serialized_moves = [m.to_dict() for m in self.planned_moves]
        return {
            "sourceFolder": self.source_folder,
            "moves": serialized_moves,
            "plannedMoves": serialized_moves,
            "totalPlanned": len([m for m in self.planned_moves if m.status == "ready"]),
            "totalExcluded": len([m for m in self.planned_moves if m.status == "excluded"]),
            "totalConflicts": len([m for m in self.planned_moves if m.status == "conflict"]),
            "totalFiles": len(self.planned_moves),
            "skippedFiles": self.skipped_files,
            "errorFiles": self.error_files,
        }


class OrganizePlanner:
    """Scans a folder and generates a file organization plan without moving anything."""

    def __init__(
        self,
        college_keywords: Optional[List[str]] = None,
        project_keywords: Optional[List[str]] = None,
    ):
        self.college_keywords = college_keywords if college_keywords is not None else DEFAULT_COLLEGE_KEYWORDS
        self.project_keywords = project_keywords or []

    def scan_and_plan(self, source_folder: str) -> OrganizePlan:
        """
        Walk source_folder, categorize each file, propose destinations.
        Returns OrganizePlan with no files moved.
        """
        root = Path(source_folder)
        plan = OrganizePlan(source_folder=source_folder)

        if not root.exists() or not root.is_dir():
            return plan

        # Collect all proposed destination paths to detect inter-plan conflicts
        dest_map: Dict[str, str] = {}  # dest_path -> first move id

        for dirpath, dirnames, filenames in os.walk(root):
            # Skip hidden dirs
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            for fname in filenames:
                if fname.startswith("."):
                    plan.skipped_files += 1
                    continue
                file_path = Path(dirpath) / fname
                try:
                    size = file_path.stat().st_size
                except OSError:
                    plan.error_files += 1
                    continue

                category, reason = categorize_file(
                    file_path,
                    college_keywords=self.college_keywords,
                    project_keywords=self.project_keywords,
                )

                dest_dir = root / category
                dest_path = str(dest_dir / fname)
                move_id = f"pm-{uuid.uuid4().hex[:10]}"

                # Determine status
                status = "ready"
                conflict_note = ""

                # Conflict: destination already exists on disk
                if Path(dest_path).exists():
                    status = "conflict"
                    conflict_note = "A file with this name already exists at the destination."
                # Conflict: another planned move targets the same destination
                elif dest_path in dest_map:
                    status = "conflict"
                    conflict_note = f"Destination collision with another planned file (id: {dest_map[dest_path]})."
                else:
                    dest_map[dest_path] = move_id

                # Skip if source is already inside the correct category folder
                if str(file_path.parent) == str(dest_dir):
                    status = "excluded"
                    conflict_note = "File is already in the correct category folder."

                plan.planned_moves.append(
                    PlannedMove(
                        id=move_id,
                        filename=fname,
                        source_path=str(file_path),
                        dest_path=dest_path,
                        category=category,
                        rule_reason=reason,
                        size_bytes=size,
                        status=status,
                        conflict_note=conflict_note,
                    )
                )

        return plan
