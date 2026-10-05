from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ScanRequest(BaseModel):
    target_path: str = Field(..., description="Root path on disk to scan")
    options: Optional[Dict[str, bool]] = Field(
        default_factory=lambda: {
            "exactDupes": True,
            "similarImages": True,
            "oldFiles": True,
            "tempFiles": True,
            "storageAnalytics": True,
        }
    )

class ScanStatusResponse(BaseModel):
    scan_id: str
    status: str
    progress: int
    total_files: int
    total_directories: int
    total_size: int
    formatted_size: str
    error_count: int
    message: str

class SystemVolume(BaseModel):
    path: str
    name: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    formatted_total: str
    formatted_used: str
    formatted_free: str
    percent_used: float
