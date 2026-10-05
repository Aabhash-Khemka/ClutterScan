from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager

router = APIRouter(prefix="/duplicates", tags=["Exact Duplicates"])

@router.get("/{scan_id}")
def get_duplicates(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve all exact duplicate groups discovered in the specified scan."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    return [g.to_dict() for g in res.duplicate_groups]

@router.get("/{scan_id}/{group_id}")
def get_duplicate_group(scan_id: str, group_id: str) -> Dict[str, Any]:
    """Retrieve a specific duplicate group by its ID."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    group = next((g for g in res.duplicate_groups if g.id == group_id), None)
    if not group:
        raise HTTPException(status_code=404, detail=f"Duplicate group '{group_id}' not found.")
    return group.to_dict()
