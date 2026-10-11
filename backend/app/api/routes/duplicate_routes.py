from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager
from app.database.repositories.scan_repository import ScanRepository

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

