import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.models.file_node import FileNode
from app.models.directory import DirectoryNode
from app.services.scanner.tree_builder import TreeBuilder
from app.utils.file_utils import is_hidden_path, check_path_accessible
from app.core.exceptions import PathNotFoundError, PermissionDeniedError

class Scanner:
    """Algorithm 1: Recursive Directory Scanning and Tree Construction."""

    def __init__(self, root_path: str):
        self.root_path = Path(root_path).resolve()
        self.errors: List[Dict[str, Any]] = []
        self.total_files_scanned: int = 0
        self.total_directories_scanned: int = 0
        self._node_counter: int = 0

    def _next_node_id(self) -> str:
        self._node_counter += 1
        return f"node-{self._node_counter}"

    def scan(self) -> FileNode:
        """
        Validate path and execute recursive filesystem traversal.
        Calculates aggregate directory sizes upon completion.
        """
        is_accessible, err_msg = check_path_accessible(str(self.root_path))
        if not is_accessible:
            if "does not exist" in (err_msg or ""):
                raise PathNotFoundError(err_msg)
            elif "Permission denied" in (err_msg or ""):
                raise PermissionDeniedError(err_msg)
            else:
                raise PermissionDeniedError(err_msg or "Cannot access root directory.")

        root_node = self._scan_directory(self.root_path)
        
        # Algorithm 2: Directory Size Aggregation
        TreeBuilder.calculate_size(root_node)
        return root_node

    def _scan_directory(self, current_path: Path) -> FileNode:
        """Recursively scan directory and construct N-ary tree."""
        node_id = self._next_node_id()
        name = current_path.name if current_path.name else str(current_path)

        # Get metadata
        try:
            stat_result = current_path.stat()
            created_at = datetime.fromtimestamp(stat_result.st_ctime)
            modified_at = datetime.fromtimestamp(stat_result.st_mtime)
            accessed_at = datetime.fromtimestamp(stat_result.st_atime)
        except Exception as e:
            stat_result = None
            created_at = None
            modified_at = None
            accessed_at = None
            self.errors.append({
                "path": str(current_path),
                "error": f"Failed to read metadata: {str(e)}"
            })

        # Check if file or directory
        is_dir = current_path.is_dir()
        is_hidden = is_hidden_path(current_path)

        if not is_dir:
            self.total_files_scanned += 1
            file_size = stat_result.st_size if stat_result else 0
            return FileNode(
                id=node_id,
                name=name,
                path=str(current_path),
                size=file_size,
                created_at=created_at,
                modified_at=modified_at,
                accessed_at=accessed_at,
                is_directory=False,
                is_hidden=is_hidden,
                extension=current_path.suffix.lower(),
            )

        # Directory node
        self.total_directories_scanned += 1
        dir_node = DirectoryNode(
            id=node_id,
            name=name,
            path=str(current_path),
            size=0,
            created_at=created_at,
            modified_at=modified_at,
            accessed_at=accessed_at,
            is_directory=True,
            is_hidden=is_hidden,
            extension="",
            children=[],
        )

        try:
            with os.scandir(current_path) as entries:
                for entry in entries:
                    try:
                        child_path = Path(entry.path)
                        # Check for symlink loop
                        if entry.is_symlink():
                            continue
                        child_node = self._scan_directory(child_path)
                        dir_node.add_child(child_node)
                    except PermissionError as pe:
                        self.errors.append({
                            "path": entry.path,
                            "error": f"Permission denied: {str(pe)}"
                        })
                    except Exception as e:
                        self.errors.append({
                            "path": entry.path,
                            "error": str(e)
                        })
        except PermissionError as pe:
            self.errors.append({
                "path": str(current_path),
                "error": f"Permission denied accessing directory: {str(pe)}"
            })
        except OSError as oe:
            self.errors.append({
                "path": str(current_path),
                "error": f"OS error accessing directory: {str(oe)}"
            })

        return dir_node
