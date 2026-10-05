from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List

@dataclass
class ScanSession:
    """Represents a disk scanning execution session."""
    id: str
    root_path: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = "IN_PROGRESS"  # IN_PROGRESS, COMPLETED, FAILED, CANCELLED
    total_files: int = 0
    total_directories: int = 0
    total_size: int = 0
    error_count: int = 0
    scan_options: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        from app.utils.file_utils import format_size
        return {
            "id": self.id,
            "rootPath": self.root_path,
            "startTime": self.start_time.isoformat() if self.start_time else None,
            "endTime": self.end_time.isoformat() if self.end_time else None,
            "status": self.status,
            "totalFiles": self.total_files,
            "totalDirectories": self.total_directories,
            "totalSize": self.total_size,
            "formattedSize": format_size(self.total_size),
            "errorCount": self.error_count,
            "scanOptions": self.scan_options,
        }

@dataclass
class ScanReport:
    """Summary report of a completed scan."""
    scan_id: str
    root_path: str
    total_files: int
    total_directories: int
    total_size: int
    duplicate_groups_count: int
    similar_clusters_count: int
    old_files_count: int
    temp_files_count: int
    recommendations_count: int
    potential_savings_bytes: int

    def to_dict(self) -> Dict[str, Any]:
        from app.utils.file_utils import format_size
        return {
            "scanId": self.scan_id,
            "rootPath": self.root_path,
            "totalFiles": self.total_files,
            "totalDirectories": self.total_directories,
            "totalSize": self.total_size,
            "formattedTotalSize": format_size(self.total_size),
            "duplicateGroupsCount": self.duplicate_groups_count,
            "similarClustersCount": self.similar_clusters_count,
            "oldFilesCount": self.old_files_count,
            "tempFilesCount": self.temp_files_count,
            "recommendationsCount": self.recommendations_count,
            "potentialSavings": format_size(self.potential_savings_bytes),
            "potentialSavingsBytes": self.potential_savings_bytes,
        }
