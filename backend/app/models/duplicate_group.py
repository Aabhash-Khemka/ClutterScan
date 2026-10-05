from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class DuplicateFileItem:
    """Represents an individual file within an exact duplicate group."""
    id: str
    name: str
    path: str
    size: int
    content_hash: str
    resolution: str = "N/A"
    width: Optional[int] = None
    height: Optional[int] = None
    pixel_count: int = 0
    is_preferred: bool = False
    status: str = "CLEANUP CANDIDATE"
    status_desc: str = "REDUNDANT DUPLICATE"
    rationale: str = ""

    def to_dict(self) -> Dict[str, Any]:
        from app.utils.file_utils import format_size
        return {
            "id": self.id,
            "name": self.name,
            "path": self.path,
            "resolution": self.resolution,
            "size": format_size(self.size),
            "bytes": self.size,
            "isPreferred": self.is_preferred,
            "status": self.status,
            "statusDesc": self.status_desc,
            "rationale": self.rationale,
        }

@dataclass
class DuplicateGroup:
    """Represents a set of exact byte-for-byte duplicate files sharing a SHA-256 hash."""
    id: str
    sector_name: str
    hash: str
    short_hash: str
    match_count: int
    total_bytes: int
    files: List[DuplicateFileItem] = field(default_factory=list)
    reason: str = "IDENTICAL CONTENT DIGEST DETECTED."
    safety_rule: str = "PRESERVE PREFERRED COPY AS MASTER."
    staging_action: str = "QUEUE REDUNDANT DUPLICATES TO RECOMMENDATIONS."
    hex_sample: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        from app.utils.file_utils import format_size
        return {
            "id": self.id,
            "sectorName": self.sector_name,
            "hash": self.hash,
            "shortHash": self.short_hash,
            "matchCount": self.match_count,
            "sizeFormatted": format_size(self.total_bytes),
            "files": [f.to_dict() for f in self.files],
            "algorithmicRule": {
                "reason": self.reason,
                "safetyRule": self.safety_rule,
                "stagingAction": self.staging_action,
            },
            "hexSample": self.hex_sample,
        }
