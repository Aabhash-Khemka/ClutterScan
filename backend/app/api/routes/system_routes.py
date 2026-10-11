import os
import shutil
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter
import psutil
from app.utils.file_utils import format_size

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/volumes")
def get_system_volumes() -> List[Dict[str, Any]]:
    """Enumerate accessible storage drives/volumes with real capacity statistics."""
    volumes = []
    
    # Use psutil to discover real mounted Windows partitions
    try:
        partitions = psutil.disk_partitions(all=False)
    except Exception:
        partitions = []

    seen_mounts = set()
    for part in partitions:
        mount = part.mountpoint
        if mount in seen_mounts:
            continue
        seen_mounts.add(mount)
        try:
            usage = shutil.disk_usage(mount)
            pct_used = round((usage.used / usage.total) * 100, 1) if usage.total > 0 else 0
            drive_label = mount.rstrip("\\").rstrip("/")
            volumes.append({
                "path": mount,
                "name": f"Local Disk ({drive_label})",
                "fstype": part.fstype,
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

    # Fallback to C:\ if psutil found no ready volumes
    if not volumes:
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
                        "fstype": "NTFS",
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

@router.get("/folders")
def get_system_folders() -> List[Dict[str, Any]]:
    """Return real existing user directories on this machine for quick scan targeting."""
    home = Path.home()
    workspace = Path.cwd()
    if workspace.name == "backend":
        workspace = workspace.parent

    candidates = [
        {"name": "Workspace Project", "path": str(workspace)},
        {"name": "Downloads", "path": str(home / "Downloads")},
        {"name": "Pictures", "path": str(home / "OneDrive" / "Pictures") if (home / "OneDrive" / "Pictures").exists() else str(home / "Pictures")},
        {"name": "Documents", "path": str(home / "OneDrive" / "Documents") if (home / "OneDrive" / "Documents").exists() else str(home / "Documents")},
        {"name": "Desktop", "path": str(home / "OneDrive" / "Desktop") if (home / "OneDrive" / "Desktop").exists() else str(home / "Desktop")},
        {"name": "User Home", "path": str(home)},
    ]

    folders = []
    for c in candidates:
        p = Path(c["path"])
        if p.exists() and p.is_dir():
            folders.append({
                "name": c["name"],
                "path": str(p),
                "exists": True,
            })
    return folders

