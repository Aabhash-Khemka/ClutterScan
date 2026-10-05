import os
import stat
from pathlib import Path
from typing import Tuple, Optional

def format_size(size_bytes: int) -> str:
    """Format bytes into human-readable string (e.g., 24.8 MB, 1.84 GB)."""
    if size_bytes < 0:
        return "0 B"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    elif size_bytes < 1024 * 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024 * 1024):.2f} TB"

def is_hidden_path(path: Path) -> bool:
    """Check if file or directory is hidden (dotfile or Windows hidden attribute)."""
    name = path.name
    if name.startswith(".") and name != "." and name != "..":
        return True
    try:
        if os.name == "nt":
            attrs = path.stat().st_file_attributes
            return bool(attrs & stat.FILE_ATTRIBUTE_HIDDEN)
    except Exception:
        pass
    return False

def check_path_accessible(path_str: str) -> Tuple[bool, Optional[str]]:
    """Validate if path exists and is readable."""
    try:
        p = Path(path_str).resolve()
        if not p.exists():
            return False, f"Target path '{path_str}' does not exist."
        if not p.is_dir():
            return False, f"Target path '{path_str}' is not a directory."
        # Attempt to read directory entries
        try:
            with os.scandir(p) as it:
                next(it, None)
        except PermissionError:
            return False, f"Permission denied for directory '{path_str}'."
        except OSError as e:
            return False, f"OS error accessing directory: {str(e)}"
        return True, None
    except Exception as e:
        return False, str(e)
