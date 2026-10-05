import os
import shutil
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter
from app.utils.file_utils import format_size

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/volumes")
def get_system_volumes() -> List[Dict[str, Any]]:
    """Enumerate accessible storage drives/volumes with capacity statistics."""
    volumes = []
    
    # Check common drive letters on Windows or root on Unix
    candidate_roots = [f"{chr(d)}:\\" for d in range(ord('C'), ord('Z') + 1)] if os.name == 'nt' else ["/"]

    for root_str in candidate_roots:
        p = Path(root_str)
        if p.exists():
            try:
                usage = shutil.disk_usage(root_str)
                pct_used = round((usage.used / usage.total) * 100, 1) if usage.total > 0 else 0
                volumes.append({
                    "path": root_str,
                    "name": f"Volume ({root_str.rstrip('\\')})",
                    "totalBytes": usage.total,
                    "usedBytes": usage.used,
                    "freeBytes": usage.free,
                    "formattedTotal": format_size(usage.total),
                    "formattedUsed": format_size(usage.used),
                    "formattedFree": format_size(usage.free),
                    "percentUsed": pct_used,
                })
            except Exception:
                continue

    return volumes
