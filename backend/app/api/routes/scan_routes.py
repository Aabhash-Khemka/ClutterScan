import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException

from app.schemas.scan_schema import ScanRequest, ScanStatusResponse
from app.services.pipeline import ScanPipelineManager
from app.utils.file_utils import check_path_accessible, format_size
from app.database.repositories.scan_repository import ScanRepository

router = APIRouter(prefix="/scan", tags=["Scanning"])

@router.post("")
def start_scan(request: ScanRequest):
    """Initiate a disk scan pipeline on the specified target path."""
    target_path = request.target_path.strip()
    if not target_path:
        raise HTTPException(status_code=400, detail="Target path is required.")

    is_accessible, err_msg = check_path_accessible(target_path)
    if not is_accessible:
        raise HTTPException(status_code=400, detail=err_msg or "Cannot access target directory.")

    scan_id = f"scan-{uuid.uuid4().hex[:8]}"
    options = request.options or {}
    ScanPipelineManager.start_pipeline(scan_id, target_path, options)

    return {
        "scanId": scan_id,
        "status": "IN_PROGRESS",
        "targetPath": target_path,
        "message": f"Scan initiated for {target_path}",
    }

@router.get("/latest")
def get_latest_scan():
    """Retrieve metadata for the most recent scan."""
    latest_id = ScanPipelineManager.get_latest_scan_id()
    if not latest_id:
        repo = ScanRepository()
        latest_sess = repo.get_latest_session()
        if latest_sess:
            return get_scan_status(latest_sess.id)
        return {"scanId": None, "status": "READY"}
    return get_scan_status(latest_id)

@router.get("/{scan_id}")
def get_scan_status(scan_id: str):
    """Query progress and execution status of an active or completed scan."""
    res = ScanPipelineManager.get_result(scan_id)
    if not res:
        # Check SQLite repository
        repo = ScanRepository()
        session = repo.get_session(scan_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Scan session '{scan_id}' not found.")
        return {
            "scanId": session.id,
            "status": session.status,
            "progress": 100 if session.status == "COMPLETED" else 0,
            "totalFiles": session.total_files,
            "totalDirectories": session.total_directories,
            "totalSize": session.total_size,
            "totalBytes": session.total_size,
            "formattedSize": session.to_dict()["formattedSize"],
            "errorCount": session.error_count,
            "errors": [],
            "message": f"Scan {session.status.lower()}",
        }

    total_bytes = res.tree_root.aggregate_size if res.tree_root else 0
    return {
        "scanId": res.scan_id,
        "status": res.status,
        "progress": res.progress_percent,
        "totalFiles": len(res.all_files),
        "totalDirectories": len(res.all_directories),
        "totalSize": total_bytes,
        "totalBytes": total_bytes,
        "formattedSize": format_size(total_bytes),
        "errorCount": len(res.errors),
        "errors": res.errors,
        "message": res.error_message if res.status == "FAILED" else f"Scan {res.status.lower()}",
    }

@router.get("/{scan_id}/tree")
def get_filesystem_tree(scan_id: str):
    """Retrieve N-ary directory tree for Storage visualization."""
    res = ScanPipelineManager.get_result(scan_id)
    if res and res.tree_root:
        return [res.tree_root.to_dict()]

    repo = ScanRepository()
    tree_root = repo.get_tree(scan_id)
    if not tree_root:
        raise HTTPException(status_code=404, detail="Filesystem tree not found for this scan.")
    return [tree_root.to_dict()]
