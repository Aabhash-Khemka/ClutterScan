from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from app.services.snapshot.snapshot_manager import SnapshotManager
from app.services.cleanup.cleanup_manager import CleanupManager

router = APIRouter(prefix="", tags=["History and Recovery"])

@router.get("/history")
def get_history() -> Dict[str, Any]:
    """Retrieve historical scans, snapshot growth deltas, and recovery logs."""
    scans = SnapshotManager.get_historical_scans()
    deltas = SnapshotManager.get_latest_deltas()
    cleanup_mgr = CleanupManager()
    recovery_items = cleanup_mgr.get_recovery_log()

    return {
        "historicalScans": [s.to_dict() for s in scans],
        "snapshotDeltas": [d.to_dict() for d in deltas],
        "recoveryEntries": [r.to_dict() for r in recovery_items],
    }

@router.get("/recovery")
def get_recovery_log() -> List[Dict[str, Any]]:
    """Retrieve complete audit log of all safe cleanup dispatches."""
    cleanup_mgr = CleanupManager()
    items = cleanup_mgr.get_recovery_log()
    return [i.to_dict() for i in items]

@router.post("/recovery/{file_id}/restore")
def restore_file(file_id: str) -> Dict[str, Any]:
    """Restore a quarantined file back to its original location."""
    cleanup_mgr = CleanupManager()
    ok, message = cleanup_mgr.restore_file(file_id)
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}
