from dataclasses import dataclass
from typing import List
from app.models.file_node import FileNode

@dataclass
class DirectoryNode(FileNode):
    """Specialized node for directory entries, managing child nodes."""
    def __post_init__(self):
        self.is_directory = True

    def add_child(self, child: FileNode) -> None:
        self.children.append(child)

    def remove_child(self, child_id: str) -> bool:
        initial_len = len(self.children)
        self.children = [c for c in self.children if c.id != child_id]
        return len(self.children) < initial_len
