from typing import List, Dict, Any
from pathlib import Path
from collections import defaultdict

from app.models.file_node import FileNode
from app.utils.file_utils import format_size

class AnalyticsEngine:
    """Computes storage breakdowns, file-type distributions, and disk metrics."""

    CATEGORY_MAP = {
        # Documents
        ".pdf": "Documents", ".docx": "Documents", ".doc": "Documents", 
        ".txt": "Documents", ".xlsx": "Documents", ".pptx": "Documents",
        # Media
        ".jpg": "Pictures", ".jpeg": "Pictures", ".png": "Pictures",
        ".webp": "Pictures", ".gif": "Pictures", ".mp4": "Videos",
        ".mkv": "Videos", ".mov": "Videos", ".mp3": "Audio", ".wav": "Audio",
        # Archives
        ".zip": "Archives", ".tar": "Archives", ".gz": "Archives", 
        ".7z": "Archives", ".rar": "Archives",
        # Binaries & Executables
        ".exe": "Binaries", ".msi": "Binaries", ".dll": "Binaries",
        # Code & Projects
        ".py": "Code", ".js": "Code", ".ts": "Code", ".tsx": "Code", 
        ".html": "Code", ".css": "Code", ".json": "Code", ".parquet": "Data",
    }

    @classmethod
    def get_type_distribution(cls, files: List[FileNode]) -> Dict[str, Dict[str, Any]]:
        """Group files by category and calculate total sizes and counts."""
        distribution = defaultdict(lambda: {"count": 0, "bytes": 0})
        
        for f in files:
            if f.is_directory:
                continue
            ext = Path(f.path).suffix.lower()
            category = cls.CATEGORY_MAP.get(ext, "Other")
            distribution[category]["count"] += 1
            distribution[category]["bytes"] += f.size

        result = {}
        for cat, stats in distribution.items():
            result[cat] = {
                "count": stats["count"],
                "bytes": stats["bytes"],
                "formatted": format_size(stats["bytes"]),
            }
        return result

    @classmethod
    def get_top_largest_files(cls, files: List[FileNode], limit: int = 10) -> List[Dict[str, Any]]:
        """Get the largest files across the scan."""
        file_nodes = [f for f in files if not f.is_directory]
        sorted_files = sorted(file_nodes, key=lambda f: f.size, reverse=True)[:limit]
        return [
            {
                "id": f.id,
                "name": f.name,
                "path": f.path,
                "size": format_size(f.size),
                "bytes": f.size,
                "extension": f.extension,
            }
            for f in sorted_files
        ]
