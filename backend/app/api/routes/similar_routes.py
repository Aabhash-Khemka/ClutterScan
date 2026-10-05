from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager

router = APIRouter(prefix="/similar-images", tags=["Similar Images"])

@router.get("/{scan_id}")
def get_similar_images(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve visual similarity clusters identified through perceptual hashing."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    return [c.to_dict() for c in res.similar_clusters]
