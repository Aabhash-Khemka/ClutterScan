from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List
from app.utils.file_utils import format_size

@dataclass
class StorageSnapshot:
    """Represents storage usage metrics at the completion of a scan."""
    id: str
    scan_id: str
    timestamp: datetime
    root_path: str
    total_storage: int
    used_storage: int
    free_storage: int
    total_inodes: int
    directory_sizes: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "scanId": self.scan_id,
            "timestamp": self.timestamp.isoformat(),
            "rootPath": self.root_path,
            "totalStorage": self.total_storage,
            "usedStorage": self.used_storage,
            "freeStorage": self.free_storage,
            "totalStorageFormatted": format_size(self.total_storage),
            "usedStorageFormatted": format_size(self.used_storage),
            "freeStorageFormatted": format_size(self.free_storage),
            "totalInodes": self.total_inodes,
            "directorySizes": self.directory_sizes,
        }

@dataclass
class SnapshotDelta:
    """Algorithm 8: Directory-level storage growth/reduction delta."""
    directory: str
    delta_bytes: int
    delta: str
    direction: str  # 'EXPANDED' or 'CONTRACTED'
    is_positive: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "directory": self.directory,
            "delta": self.delta,
            "direction": self.direction,
            "isPositive": self.is_positive,
        }

@dataclass
class HistoricalScanRecord:
    """Formatted historical scan entry matching frontend HistoricalScanEntry."""
    id: str
    date: str
    root_target: str
    inodes: str
    total: str
    status: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "date": self.date,
            "rootTarget": self.root_target,
            "inodes": self.inodes,
            "total": self.total,
            "status": self.status,
        }
