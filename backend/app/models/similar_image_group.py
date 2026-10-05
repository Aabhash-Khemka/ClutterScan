from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class PerceptualImageItem:
    """Represents an image in a visual similarity cluster."""
    id: str
    filename: str
    path: str
    dimensions: str
    p_hash: str
    hamming_distance: int = 0
    similarity: str = "100.0%"
    is_reference: bool = False
    badge: str = "REFERENCE"
    sector_label: str = "[SECTOR_01 // BASE]"
    overlay_type: str = "[RAW_OPTICAL_FRAME]"
    overlay_detail: str = "64-BIT DCT PROCESSED"
    img_url: str = ""
    alt_text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "sectorLabel": self.sector_label,
            "badge": self.badge,
            "isReference": self.is_reference,
            "filename": self.filename,
            "dimensions": self.dimensions,
            "hammingDistance": self.hamming_distance,
            "similarity": self.similarity,
            "path": self.path,
            "pHash": self.p_hash,
            "overlayType": self.overlay_type,
            "overlayDetail": self.overlay_detail,
            "imgUrl": self.img_url or f"/api/files/preview?path={self.path}",
            "altText": self.alt_text or f"Perceptual capture of {self.filename}",
        }

@dataclass
class SimilarImageCluster:
    """Represents a cluster of visually similar images."""
    id: str
    label: str
    match_count: int
    images: List[PerceptualImageItem] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "matchCount": self.match_count,
            "images": [img.to_dict() for img in self.images],
        }
