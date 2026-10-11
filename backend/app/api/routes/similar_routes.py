from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.pipeline import ScanPipelineManager
from app.database.repositories.scan_repository import ScanRepository

router = APIRouter(prefix="/similar-images", tags=["Similar Images"])

@router.get("/{scan_id}")
def get_similar_images(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve visual similarity clusters identified through perceptual hashing."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        return [c.to_dict() for c in res.similar_clusters]

    repo = ScanRepository()
    clusters = repo.get_similar_image_clusters(scan_id)
    if clusters is not None and (len(clusters) > 0 or repo.get_session(scan_id) is not None):
        return [c.to_dict() for c in clusters]
    raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")

