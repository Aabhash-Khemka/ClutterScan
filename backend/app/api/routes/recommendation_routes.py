from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager
from app.database.repositories.scan_repository import ScanRepository

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/{scan_id}")
def get_recommendations(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve scored and ranked cleanup candidate recommendations."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        return [r.to_dict() for r in res.recommendations]

    repo = ScanRepository()
    recs = repo.get_recommendations(scan_id)
    if recs is not None and (len(recs) > 0 or repo.get_session(scan_id) is not None):
        return [r.to_dict() for r in recs]
    raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")

