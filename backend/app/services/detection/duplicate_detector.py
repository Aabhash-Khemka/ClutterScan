from pathlib import Path
from typing import List, Dict
from collections import defaultdict

from app.models.file_node import FileNode
from app.models.duplicate_group import DuplicateGroup, DuplicateFileItem
from app.services.detection.resolution_detector import ResolutionDetector
from app.utils.hashing import hash_file_sha256, get_hex_sample

class DuplicateDetector:
    """Algorithm 3: Exact Duplicate Detection using Size Pre-filtering and Chunked Hashing."""

    def __init__(self, chunk_size: int = 64 * 1024):
        self.chunk_size = chunk_size

    def find_duplicates(self, files: List[FileNode]) -> List[DuplicateGroup]:
        """
        Identify byte-for-byte exact duplicate groups.
        Uses file-size pre-filter, followed by SHA-256 chunked hashing.
        """
        # Step 1: Group files by size
        size_groups: Dict[int, List[FileNode]] = defaultdict(list)
        for f in files:
            # Skip empty files (0 bytes) or directories
            if f.is_directory or f.size == 0:
                continue
            size_groups[f.size].append(f)

        duplicate_groups: List[DuplicateGroup] = []
        group_idx = 1

        # Step 2: Filter out unique sizes (|G| < 2)
        for size, candidates in size_groups.items():
            if len(candidates) < 2:
                continue

            # Step 3: Compute chunked SHA-256 for candidate files
            hash_groups: Dict[str, List[FileNode]] = defaultdict(list)
            for file_node in candidates:
                try:
                    f_hash = hash_file_sha256(Path(file_node.path), chunk_size=self.chunk_size)
                    hash_groups[f_hash].append(file_node)
                except Exception:
                    # Inaccessible or locked file during hashing; skip
                    continue

            # Step 4: Any hash bucket with > 1 file is an exact duplicate group
            for content_hash, matching_nodes in hash_groups.items():
                if len(matching_nodes) < 2:
                    continue

                items: List[DuplicateFileItem] = []
                for idx, node in enumerate(matching_nodes):
                    item = DuplicateFileItem(
                        id=f"dup-{group_idx}-{idx + 1}",
                        name=node.name,
                        path=node.path,
                        size=node.size,
                        content_hash=content_hash,
                    )
                    items.append(item)

                # Algorithm 4: Resolution-aware duplicate selection
                preferred, candidate_list = ResolutionDetector.evaluate_group_resolutions(items)
                all_items = [preferred] + candidate_list

                # Generate hex sample from the first accessible file
                hex_sample = []
                try:
                    hex_sample = get_hex_sample(Path(preferred.path))
                except Exception:
                    pass

                short_hash = f"{content_hash[:16]}...{content_hash[-4:]}"
                sector_name = f"SECTOR_{group_idx:03d}"

                group = DuplicateGroup(
                    id=f"{group_idx:03d}",
                    sector_name=sector_name,
                    hash=content_hash,
                    short_hash=short_hash,
                    match_count=len(all_items),
                    total_bytes=sum(item.size for item in all_items),
                    files=all_items,
                    hex_sample=hex_sample,
                )
                duplicate_groups.append(group)
                group_idx += 1

        return duplicate_groups
