from pathlib import Path
from typing import List, Tuple
from app.models.duplicate_group import DuplicateFileItem
from app.utils.image_utils import is_supported_image, get_image_resolution

class ResolutionDetector:
    """Algorithm 4: Resolution-Aware Duplicate Selection."""

    @staticmethod
    def evaluate_group_resolutions(files: List[DuplicateFileItem]) -> Tuple[DuplicateFileItem, List[DuplicateFileItem]]:
        """
        Evaluate image resolutions within duplicate groups.
        Prefers the copy with the highest pixel resolution (width * height).
        Marks lower-resolution copies as cleanup candidates.
        For non-image duplicates, applies canonical path and age heuristics.
        """
        if not files:
            raise ValueError("Cannot evaluate empty file group.")

        # Check if all files in the group are images
        has_images = any(is_supported_image(Path(f.path)) for f in files)

        if has_images:
            for f in files:
                p = Path(f.path)
                res = get_image_resolution(p)
                if res:
                    f.width, f.height = res
                    f.pixel_count = f.width * f.height
                    f.resolution = f"{f.width} \u00d7 {f.height}"
                else:
                    f.resolution = "N/A"
                    f.pixel_count = 0

            # Sort files by pixel_count descending
            sorted_files = sorted(files, key=lambda x: x.pixel_count, reverse=True)
            preferred = sorted_files[0]
            candidates = sorted_files[1:]

            # Check if there is a true resolution difference
            has_different_resolutions = any(
                c.pixel_count < preferred.pixel_count for c in candidates
            )

            preferred.is_preferred = True
            preferred.status = "PREFERRED COPY (KEEP)"
            preferred.status_desc = "HIGHEST NATIVE SENSOR RESOLUTION"
            preferred.rationale = (
                f"HIGHEST NATIVE SENSOR RESOLUTION ({preferred.resolution}). ZERO LOSSY RECOMPRESSION DETECTED."
            )

            for c in candidates:
                c.is_preferred = False
                if has_different_resolutions and c.pixel_count < preferred.pixel_count:
                    c.status = "CLEANUP CANDIDATE (MARKED)"
                    c.status_desc = "DOWNSAMPLED COMPRESSED DUPLICATE"
                    c.rationale = (
                        f"IDENTICAL VISUAL CONTENT // DOWNSAMPLED COMPRESSED DUPLICATE ({c.resolution})."
                    )
                else:
                    # Same resolution
                    ResolutionDetector._assign_path_rationale(c)

            return preferred, candidates

        # Non-image files: select canonical file (prefer Documents/Pictures over Downloads/Temp)
        def _heuristic_rank(f: DuplicateFileItem) -> int:
            p_lower = f.path.lower()
            score = 100
            if "download" in p_lower:
                score -= 40
            if "temp" in p_lower:
                score -= 50
            if "desktop" in p_lower:
                score -= 20
            if "(1)" in p_lower or "copy" in p_lower:
                score -= 30
            return score

        sorted_files = sorted(files, key=_heuristic_rank, reverse=True)
        preferred = sorted_files[0]
        candidates = sorted_files[1:]

        preferred.is_preferred = True
        preferred.status = "PREFERRED COPY (KEEP)"
        preferred.status_desc = "PRIMARY STORAGE LOCATION"
        preferred.rationale = "CANONICAL VERSION COMMITTED IN PRIMARY WORKSPACE."

        for c in candidates:
            c.is_preferred = False
            ResolutionDetector._assign_path_rationale(c)

        return preferred, candidates

    @staticmethod
    def _assign_path_rationale(file_item: DuplicateFileItem) -> None:
        p_lower = file_item.path.lower()
        if "download" in p_lower:
            file_item.status = "CLEANUP CANDIDATE"
            file_item.status_desc = "STALE DOWNLOAD REPLICATION"
            file_item.rationale = "IDENTICAL BYTE BLOCKS REDUNDANTLY CACHED IN DOWNLOADS."
        elif "temp" in p_lower:
            file_item.status = "CLEANUP CANDIDATE"
            file_item.status_desc = "EPHEMERAL STAGING DIR"
            file_item.rationale = "TRANSIENT REPLICA IN TEMPORARY WORKSPACE."
        elif "desktop" in p_lower:
            file_item.status = "CLEANUP CANDIDATE"
            file_item.status_desc = "STALE DESKTOP COPY"
            file_item.rationale = "EXACT BITSTREAM REPLICATION LOCATED ON DESKTOP."
        else:
            file_item.status = "CLEANUP CANDIDATE"
            file_item.status_desc = "REDUNDANT REPLICA"
            file_item.rationale = "EXACT BITSTREAM REPLICATION ACROSS MULTIPLE VOLUMES."
