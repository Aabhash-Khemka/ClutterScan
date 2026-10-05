from typing import List
from app.models.file_node import FileNode

class TreeBuilder:
    """Algorithm 2: Directory Size Aggregation and Tree Utilities."""
    
    @staticmethod
    def calculate_size(node: FileNode) -> int:
        """
        Algorithm 2: Post-order recursive size calculation.
        Computes the total aggregate size of each directory by summing
        all descendant file sizes.
        """
        if not node.is_directory:
            node.aggregate_size = node.size
            return node.size

        total = 0
        for child in node.children:
            total += TreeBuilder.calculate_size(child)

        node.aggregate_size = total
        return total

    @staticmethod
    def collect_file_nodes(root: FileNode) -> List[FileNode]:
        """Collect all leaf file nodes from the tree."""
        files = []
        def _traverse(node: FileNode):
            if not node.is_directory:
                files.append(node)
            else:
                for child in node.children:
                    _traverse(child)
        _traverse(root)
        return files

    @staticmethod
    def collect_directory_nodes(root: FileNode) -> List[FileNode]:
        """Collect all directory nodes from the tree."""
        dirs = []
        def _traverse(node: FileNode):
            if node.is_directory:
                dirs.append(node)
                for child in node.children:
                    _traverse(child)
        _traverse(root)
        return dirs
