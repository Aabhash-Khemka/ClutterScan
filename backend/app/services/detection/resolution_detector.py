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
            preferred.status = "PREFERRED REFERENCE (REVIEW)"
            preferred.status_desc = "REFERENCE FOR THIS MATCHING GROUP"
            preferred.rationale = (
                f"Chosen as the group's reference ({preferred.resolution}). "
                "The matching SHA-256 digest indicates identical file content; "
                "this does not establish which location you prefer to keep."
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
                    c.status = "REVIEW CANDIDATE"
                    c.status_desc = "SAME CONTENT AS THE REFERENCE"
                    c.rationale = (
                        "This file has the same SHA-256 digest and image dimensions as the reference. "
                        "No user-specific keep preference is recorded."
                    )

            return preferred, candidates

        # Non-image files: select canonical file (prefer Documents/Pictures over Downloads/Temp)
        def _heuristic_details(f: DuplicateFileItem) -> tuple[int, List[str]]:
            p_lower = f.path.lower()
            score = 100
            signals = []
            if "download" in p_lower:
                score -= 40
                signals.append("path contains Downloads (-40)")
            if "temp" in p_lower:
                score -= 50
                signals.append("path contains 'temp' (-50)")
            if "desktop" in p_lower:
                score -= 20
                signals.append("path contains Desktop (-20)")
            if "(1)" in p_lower or "copy" in p_lower:
                score -= 30
                signals.append("name contains '(1)' or 'copy' (-30)")
            return score, signals

        sorted_files = sorted(
            files, key=lambda f: _heuristic_details(f)[0], reverse=True
        )
        preferred = sorted_files[0]
        candidates = sorted_files[1:]

        preferred.is_preferred = True
        preferred_score, preferred_signals = _heuristic_details(preferred)
        preferred.status = "PREFERRED REFERENCE (REVIEW)"
        preferred.status_desc = "PATH/NAME HEURISTIC REFERENCE"
        preferred.rationale = (
            f"Selected as the reference by a path/name score of {preferred_score}/100"
            + (f" ({'; '.join(preferred_signals)})." if preferred_signals else " (no penalty signals).")
            + " This heuristic does not know which copy you prefer."
        )

        for c in candidates:
            c.is_preferred = False
            candidate_score, candidate_signals = _heuristic_details(c)
            c.status = "REVIEW CANDIDATE"
            c.status_desc = "RANKED BY PATH/NAME HEURISTIC"
            if candidate_score == preferred_score:
                c.rationale = (
                    f"Tied with the reference at {candidate_score}/100; the first matching file "
                    "in scan order is shown as the reference. This is not a user preference."
                )
            else:
                c.rationale = (
                    f"Ranked for review by a path/name score of {candidate_score}/100"
                    + (f" ({'; '.join(candidate_signals)})." if candidate_signals else " (no penalty signals).")
                    + " A lower score does not mean this copy is unnecessary."
                )

        return preferred, candidates
