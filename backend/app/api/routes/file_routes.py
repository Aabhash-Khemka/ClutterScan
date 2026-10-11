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

from app.database.repositories.scan_repository import ScanRepository
from app.services.analysis.file_analyzer import FileAnalyzer

@router.get("/{scan_id}")
def get_metadata_files(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve unified old and temporary file candidates for the Files screen."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        return res.unified_metadata_files

    repo = ScanRepository()
    files = repo.get_files(scan_id)
    if files or repo.get_session(scan_id) is not None:
        analyzer = FileAnalyzer()
        return analyzer.get_unified_metadata_items(files)
    raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")

@router.get("/{scan_id}/old")
def get_old_files(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve files exceeding the configured staleness threshold."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        return res.old_files

    repo = ScanRepository()
    files = repo.get_files(scan_id)
    if files or repo.get_session(scan_id) is not None:
        analyzer = FileAnalyzer()
        old_files, _ = analyzer.detect_candidates(files)
        return old_files
    raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")

@router.get("/{scan_id}/temporary")
def get_temporary_files(scan_id: str) -> List[Dict[str, Any]]:
    """Retrieve detected temporary artifacts and scratch spaces."""
    res = ScanPipelineManager.get_result(scan_id)
    if res:
        return res.temp_files

    repo = ScanRepository()
    files = repo.get_files(scan_id)
    if files or repo.get_session(scan_id) is not None:
        analyzer = FileAnalyzer()
        _, temp_files = analyzer.detect_candidates(files)
        return temp_files
    raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
