from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/{scan_id}")
def get_recommendations(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve scored and ranked cleanup candidate recommendations."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    return [r.to_dict() for r in res.recommendations]
