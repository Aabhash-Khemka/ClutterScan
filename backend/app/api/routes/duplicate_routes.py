from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager
from app.database.repositories.scan_repository import ScanRepository
from app.services.cleanup.cleanup_manager import CleanupManager

router = APIRouter(prefix="/duplicates", tags=["Exact Duplicates"])

@router.get("/{scan_id}")
def get_duplicates(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve all exact duplicate groups discovered in the specified scan."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        return [g.to_dict() for g in res.duplicate_groups]

    repo = ScanRepository()
    groups = repo.get_duplicate_groups(scan_id)
    if groups is not None and (len(groups) > 0 or repo.get_session(scan_id) is not None):
        return [g.to_dict() for g in groups]
    raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")

@router.get("/{scan_id}/{group_id}")
def get_duplicate_group(scan_id: str, group_id: str) -> Dict[str, Any]:
    """Retrieve a specific duplicate group by its ID."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        group = next((g for g in res.duplicate_groups if g.id == group_id), None)
        if group:
            return group.to_dict()
        raise HTTPException(status_code=404, detail=f"Duplicate group '{group_id}' not found.")

    repo = ScanRepository()
    groups = repo.get_duplicate_groups(scan_id)
    group = next((g for g in groups if g.id == group_id), None)
    if not group:
        raise HTTPException(status_code=404, detail=f"Duplicate group '{group_id}' not found.")
    return group.to_dict()


class BulkDuplicateDeleteRequest(BaseModel):
    scanId: Optional[str] = None
    filePaths: List[str]
    preferTrash: bool = True


@router.post("/bulk-delete")
def bulk_delete_duplicates(payload: BulkDuplicateDeleteRequest) -> Dict[str, Any]:
    """
    Safely delete selected duplicate files in bulk while preserving retained copies.
    Uses existing CleanupManager (OS Recycle Bin / local recovery vault).
    """
    if not payload.filePaths:
        raise HTTPException(status_code=400, detail="No file paths provided for deletion.")

    # Validate target file existence and normalize paths
    candidates = []
    for path_str in payload.filePaths:
        p = Path(path_str)
        if not p.exists() or not p.is_file():
            # File might have already moved or disappeared
            candidates.append({"targetPath": path_str, "bytes": 0})
        else:
            candidates.append({"targetPath": path_str, "bytes": p.stat().st_size})

    cleanup_mgr = CleanupManager()
    results = cleanup_mgr.execute_safe_cleanup(
        targets=candidates,
        prefer_trash=payload.preferTrash,
    )

    deleted_paths = {
        r.origin_path for r in results if not r.status.startswith("FAILED")
    }

    # If scanId is provided, reconcile in-memory ScanPipelineManager and repository
    scan_id = payload.scanId
    if scan_id:
        res = ScanPipelineManager.get_result(scan_id)
        if res:
            for g in res.duplicate_groups:
                g.files = [f for f in g.files if f.path not in deleted_paths]
                g.match_count = len(g.files)
                g.total_bytes = sum(f.size for f in g.files)
            # Remove groups that have fewer than 2 files left (no longer duplicates)
            res.duplicate_groups = [g for g in res.duplicate_groups if len(g.files) >= 2]

        repo = ScanRepository()
        for p in deleted_paths:
            try:
                repo.delete_file_by_path(scan_id, p)
            except Exception:
                pass

    return {
        "success": True,
        "deletedCount": len(deleted_paths),
        "failedCount": len(results) - len(deleted_paths),
        "results": [r.to_dict() for r in results],
    }


