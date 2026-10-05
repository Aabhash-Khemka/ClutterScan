import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Tuple, Set

from app.models.file_node import FileNode
from app.utils.file_utils import format_size
from app.core.config import settings

class FileAnalyzer:
    """Algorithm 6: Old and Temporary File Detection."""

    def __init__(
        self,
        old_threshold_days: int = settings.DEFAULT_OLD_FILE_DAYS,
        temp_extensions: Set[str] = settings.TEMP_EXTENSIONS,
        temp_directories: Set[str] = settings.TEMP_DIRECTORIES,
    ):
        self.old_threshold_seconds = old_threshold_days * 84600
        self.temp_extensions = {ext.lower() for ext in temp_extensions}
        self.temp_directories = {d.lower() for d in temp_directories}

    def detect_candidates(
        self, files: List[FileNode], current_time: float = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Analyze files to identify:
        - Old files (modification timestamp > threshold)
        - Temporary files (extension, path pattern, or temporary directories)
        Returns (old_candidates, temporary_candidates).
        """
        if current_time is None:
            current_time = time.time()

        old_files: List[Dict[str, Any]] = []
        temp_files: List[Dict[str, Any]] = []

        for f in files:
            if f.is_directory:
                continue

            file_path = Path(f.path)
            ext = file_path.suffix.lower()
            name = file_path.name.lower()
            path_parts = {part.lower() for part in file_path.parts}

            # Check age
            file_age_days = 0
            if f.modified_at:
                mod_timestamp = f.modified_at.timestamp()
                age_seconds = max(0.0, current_time - mod_timestamp)
                file_age_days = int(age_seconds / 86400)
            
            is_old = file_age_days >= (self.old_threshold_seconds / 86400)

            # Check temporary status
            is_temp = False
            temp_reason = ""
            if ext in self.temp_extensions:
                is_temp = True
                temp_reason = f"EXTENSION_MATCH ({ext.upper()})"
            elif any(temp_dir in path_parts for temp_dir in self.temp_directories):
                is_temp = True
                temp_reason = "LOCATED_IN_TEMPORARY_DIRECTORY"
            elif name.startswith("~") or name.endswith(".tmp") or ".cache" in name:
                is_temp = True
                temp_reason = "TEMPORARY_FILENAME_PATTERN"

            if is_old:
                type_label = self._classify_type(ext)
                old_files.append({
                    "id": f"old-{f.id}",
                    "path": f.path,
                    "inodeAge": f"{file_age_days} DAYS",
                    "type": type_label,
                    "size": format_size(f.size),
                    "bytes": f.size,
                    "reason": f"INODE ACCESS/MODIFIED TIMESTAMP > {file_age_days} DAYS",
                    "isStaged": False,
                    "ageDays": file_age_days,
                })

            if is_temp:
                temp_files.append({
                    "id": f"tmp-{f.id}",
                    "path": f.path,
                    "inodeAge": f"{file_age_days} DAYS",
                    "type": "TMP" if ext == ".tmp" else "CACHE" if "cache" in ext else "EPHEMERAL",
                    "size": format_size(f.size),
                    "bytes": f.size,
                    "reason": temp_reason or "UNRESOLVED RUNTIME ARTIFACT",
                    "isStaged": False,
                    "ageDays": file_age_days,
                })

        return old_files, temp_files

    def get_unified_metadata_items(self, files: List[FileNode]) -> List[Dict[str, Any]]:
        """Combine old and temporary files into unified MetadataFileItem list for frontend."""
        old_items, temp_items = self.detect_candidates(files)
        # Deduplicate by path
        seen_paths = set()
        unified = []
        for item in temp_items + old_items:
            if item["path"] not in seen_paths:
                seen_paths.add(item["path"])
                unified.append(item)
        return unified

    @staticmethod
    def _classify_type(ext: str) -> str:
        ext = ext.lower()
        if ext in {".zip", ".tar", ".gz", ".7z", ".rar", ".bz2"}:
            return "ARCHIVE"
        if ext in {".tmp", ".temp"}:
            return "TMP"
        if ext in {".cache", ".swp"}:
            return "CACHE"
        if ext in {".dmp", ".dump"}:
            return "DMP"
        if ext in {".log"}:
            return "LOG"
        if ext in {".iso", ".img"}:
            return "DISK_IMAGE"
        if ext in {".exe", ".msi", ".dll"}:
            return "BINARY"
        return "STALE_DATA"
