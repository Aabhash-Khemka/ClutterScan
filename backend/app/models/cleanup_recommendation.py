from dataclasses import dataclass, field
from typing import List, Dict, Any
from app.utils.file_utils import format_size

@dataclass
class CleanupRecommendation:
    """Represents a scored cleanup recommendation for an individual file."""
    id: str
    rank: str
    impact_score: int
    target_path: str
    reasons: List[str] = field(default_factory=list)
    bytes: int = 0
    is_selected: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "rank": self.rank,
            "impactScore": self.impact_score,
            "targetPath": self.target_path,
            "reasons": self.reasons,
            "recoverableFormatted": format_size(self.bytes),
            "bytes": self.bytes,
            "isSelected": self.is_selected,
        }
