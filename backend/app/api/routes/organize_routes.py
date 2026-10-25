"""Smart Organize API routes."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.organize.planner import OrganizePlanner, PlannedMove
from app.services.organize.executor import OrganizeExecutor
from app.services.organize.history import get_organize_history

router = APIRouter(prefix="/organize", tags=["Smart Organize"])


class ScanRequest(BaseModel):
    sourcePath: str
    collegeKeywords: Optional[List[str]] = None
    projectKeywords: Optional[List[str]] = None


class ExecuteRequest(BaseModel):
    sourcePath: str
    moves: List[Dict[str, Any]]


class UndoRequest(BaseModel):
    operationId: str


@router.post("/scan")
def scan_folder(req: ScanRequest) -> Dict[str, Any]:
    """Scan a folder and return an organization plan. Does NOT move files."""
    planner = OrganizePlanner(
        college_keywords=req.collegeKeywords,
        project_keywords=req.projectKeywords,
    )
    plan = planner.scan_and_plan(req.sourcePath)
    return plan.to_dict()


@router.post("/execute")
def execute_plan(req: ExecuteRequest) -> Dict[str, Any]:
    """Execute approved planned moves. Only 'ready' status moves are processed."""
    moves = []
    for m in req.moves:
        moves.append(
            PlannedMove(
                id=m.get("id", ""),
                filename=m.get("filename", ""),
                source_path=m.get("sourcePath", ""),
                dest_path=m.get("destPath", ""),
                category=m.get("category", "Unsorted"),
                rule_reason=m.get("ruleReason", ""),
                size_bytes=m.get("sizeBytes", 0),
                status=m.get("status", "ready"),
                conflict_note=m.get("conflictNote", ""),
                user_override=m.get("userOverride", False),
            )
        )
    executor = OrganizeExecutor()
    summary = executor.execute(req.sourcePath, moves)
    return summary.to_dict()


@router.post("/undo")
def undo_operation(req: UndoRequest) -> Dict[str, Any]:
    """Undo a completed organize operation — restore files to original locations."""
    executor = OrganizeExecutor()
    result = executor.undo_operation(req.operationId)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Undo failed"))
    return result


@router.get("/history")
def get_history() -> List[Dict[str, Any]]:
    """Return all recorded organize operations with per-file details."""
    return get_organize_history()
