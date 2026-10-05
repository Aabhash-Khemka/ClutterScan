import os
from pathlib import Path
from typing import Tuple

try:
    from send2trash import send2trash
    SEND2TRASH_AVAILABLE = True
except ImportError:
    SEND2TRASH_AVAILABLE = False

class TrashManager:
    """Manages moving files safely to the native OS Recycle Bin / Trash."""

    @staticmethod
    def is_available() -> bool:
        return SEND2TRASH_AVAILABLE

    @staticmethod
    def move_to_trash(filepath: Path) -> Tuple[bool, str]:
        """
        Move a file to the OS Recycle Bin/Trash.
        Returns (success: bool, message: str).
        """
        if not SEND2TRASH_AVAILABLE:
            return False, "Send2Trash library is not available."

        try:
            p_str = str(filepath.resolve())
            send2trash(p_str)
            return True, "Successfully moved to OS Recycle Bin"
        except Exception as e:
            return False, f"Failed to send to trash: {str(e)}"
