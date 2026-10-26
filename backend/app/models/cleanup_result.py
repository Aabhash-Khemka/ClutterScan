from dataclasses import dataclass
from typing import Dict, Any, Optional
from app.utils.file_utils import format_size

@dataclass
class CleanupResultItem:
    """Represents an executed cleanup event logged in the recovery audit trail."""
    id: str
    dispatch_id: str
    filename: str
    size_bytes: int
    origin_path: str
    status: str
    location: str
    timestamp: str
    is_restored: bool = False
    recovery_path: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "dispatchId": self.dispatch_id,
            "filename": self.filename,
            "sizeFormatted": format_size(self.size_bytes),
            "originPath": self.origin_path,
            "status": self.status,
            "location": self.location,
            "timestamp": self.timestamp,
            "isRestored": self.is_restored,
            "error": self.error,
        }
