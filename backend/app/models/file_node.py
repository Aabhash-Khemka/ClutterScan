from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any

@dataclass
class FileNode:
    """Base node representing a file or directory in the scanned hierarchy."""
    id: str
    name: str
    path: str
    size: int = 0
    aggregate_size: int = 0
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
    accessed_at: Optional[datetime] = None
    is_directory: bool = False
    is_hidden: bool = False
    extension: str = ""
    error: Optional[str] = None
    tag: Optional[str] = None
    children: List["FileNode"] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to hierarchical dictionary structure for frontend."""
        return {
            "id": self.id,
            "name": self.name + ("/" if self.is_directory and not self.name.endswith(("/", "\\")) else ""),
            "path": self.path,
            "size": self.formatted_size,
            "bytes": self.aggregate_size if self.is_directory else self.size,
            "isDir": self.is_directory,
            "isOpen": True if self.is_directory else False,
            "tag": self.tag,
            "children": [c.to_dict() for c in self.children] if self.is_directory else None,
        }

    @property
    def formatted_size(self) -> str:
        from app.utils.file_utils import format_size
        return format_size(self.aggregate_size if self.is_directory else self.size)
