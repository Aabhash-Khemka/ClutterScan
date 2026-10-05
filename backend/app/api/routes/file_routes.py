from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response
from app.services.pipeline import ScanPipelineManager

router = APIRouter(prefix="/files", tags=["Files and Metadata"])

@router.get("/preview")
def preview_file(path: str = Query(..., description="Absolute path of image to preview")):
    """Serve a local image file safely for browser preview."""
    target = Path(path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check mime type based on extension
    ext = target.suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".gif": "image/gif",
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(path=str(target), media_type=media_type)

@router.get("/{scan_id}")
def get_metadata_files(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve unified old and temporary file candidates for the Files screen."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    return res.unified_metadata_files

@router.get("/{scan_id}/old")
def get_old_files(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve files exceeding the configured staleness threshold."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    return res.old_files

@router.get("/{scan_id}/temporary")
def get_temporary_files(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve detected temporary artifacts and scratch spaces."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
    return res.temp_files
