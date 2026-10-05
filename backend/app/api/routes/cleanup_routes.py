from pathlib import Path
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from app.schemas.cleanup_schema import CleanupConfirmRequest
from app.services.cleanup.cleanup_manager import CleanupManager
from app.utils.file_utils import format_size

router = APIRouter(prefix="/cleanup", tags=["Cleanup"])

@router.post("/preview")
def preview_cleanup(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validate approved candidates prior to destructive migration."""
    candidates = payload.get("candidates", [])
    valid_count = 0
    total_bytes = 0
    issues = []

    for c in candidates:
        p_str = c.get("targetPath") or c.get("path")
        if not p_str:
            continue
        p = Path(p_str)
        if p.exists() and p.is_file():
            valid_count += 1
            total_bytes += p.stat().st_size
        else:
            issues.append(f"Target file '{p_str}' no longer exists on disk.")

    return {
        "candidateCount": len(candidates),
        "validCount": valid_count,
        "recoverableBytes": total_bytes,
        "recoverableFormatted": format_size(total_bytes),
        "issues": issues,
        "safeToProceed": len(issues) == 0,
    }

@router.post("/confirm")
def confirm_cleanup(payload: CleanupConfirmRequest) -> Dict[str, Any]:
    """Execute safe migration of user-confirmed files to OS Trash or local vault."""
    cleanup_mgr = CleanupManager()
    raw_candidates = [c.model_dump() for c in payload.candidates]
    results = cleanup_mgr.execute_safe_cleanup(
        targets=raw_candidates,
        prefer_trash=payload.preferTrash,
    )
    return {
        "success": True,
        "migratedCount": len(results),
        "results": [r.to_dict() for r in results],
    }
