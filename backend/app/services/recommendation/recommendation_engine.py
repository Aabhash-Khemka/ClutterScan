import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.models.file_node import FileNode
from app.models.duplicate_group import DuplicateGroup
from app.models.cleanup_recommendation import CleanupRecommendation
from app.core.config import settings
from app.utils.file_utils import format_size

class RecommendationEngine:
    """Algorithm 9: Cleanup Recommendation Scoring and Ranking."""

    def __init__(
        self,
        w_dup: float = settings.W_DUP,
        w_res: float = settings.W_RES,
        w_temp: float = settings.W_TEMP,
        w_age: float = settings.W_AGE,
        w_size: float = settings.W_SIZE,
        w_recent: float = settings.W_RECENT,
        selection_threshold: int = 60,
    ):
        self.w_dup = w_dup
        self.w_res = w_res
        self.w_temp = w_temp
        self.w_age = w_age
        self.w_size = w_size
        self.w_recent = w_recent
        self.selection_threshold = selection_threshold

    def generate_recommendations(
        self,
        files: List[FileNode],
        duplicate_groups: List[DuplicateGroup],
        old_files: List[Dict[str, Any]],
        temp_files: List[Dict[str, Any]],
        current_time: Optional[float] = None,
    ) -> List[CleanupRecommendation]:
        """
        Combine evidence from duplicate analysis, resolution, age,
        and temporary markers into weighted recommendation scores.
        """
        if current_time is None:
            current_time = time.time()

        # Map duplicate files: candidate copies (non-preferred)
        dup_candidate_map: Dict[str, Dict[str, Any]] = {}
        for group in duplicate_groups:
            for item in group.files:
                if not item.is_preferred:
                    dup_candidate_map[item.path] = {
                        "is_lower_res": "LOWER_RESOLUTION" in item.status or "DOWNSAMPLED" in item.status_desc,
                        "item": item,
                    }

        # Map old files
        old_map: Dict[str, Dict[str, Any]] = {item["path"]: item for item in old_files}

        # Map temp files
        temp_map: Dict[str, Dict[str, Any]] = {item["path"]: item for item in temp_files}

        # Collect union of all candidate paths
        candidate_paths = set(dup_candidate_map.keys()) | set(old_map.keys()) | set(temp_map.keys())

        # Map file nodes by path
        file_node_map: Dict[str, FileNode] = {f.path: f for f in files}

        recommendations: List[CleanupRecommendation] = []

        for path_str in candidate_paths:
            node = file_node_map.get(path_str)
            file_size = node.size if node else 0
            score = 0.0
            reasons: List[str] = []
            score_breakdown: List[Dict[str, Any]] = []

            # 1. Duplicate evidence
            if path_str in dup_candidate_map:
                score += self.w_dup
                score_breakdown.append({
                    "key": "exact_duplicate",
                    "label": "Exact duplicate",
                    "points": self.w_dup,
                    "explanation": "The file has the same SHA-256 content hash as another file.",
                })
                reasons.append("EXACT_DUPLICATE")
                if dup_candidate_map[path_str]["is_lower_res"]:
                    score += self.w_res
                    score_breakdown.append({
                        "key": "lower_resolution",
                        "label": "Lower-resolution copy",
                        "points": self.w_res,
                        "explanation": "Another identical image copy has a higher pixel resolution.",
                    })
                    reasons.append("LOWER_RESOLUTION")

            # 2. Temporary evidence
            if path_str in temp_map:
                score += self.w_temp
                score_breakdown.append({
                    "key": "temporary_artifact",
                    "label": "Temporary-file evidence",
                    "points": self.w_temp,
                    "explanation": "The filename, extension, or containing folder matches a temporary-file rule.",
                })
                reasons.append("TEMPORARY_ARTIFACT")

            # 3. Age evidence
            if path_str in old_map:
                score += self.w_age
                age_days = old_map[path_str].get("ageDays", 180)
                score_breakdown.append({
                    "key": "older_file",
                    "label": "Older file",
                    "points": self.w_age,
                    "explanation": f"The file's recorded modification time is {age_days} days old.",
                })
                reasons.append(f"UNRESOLVED_INODE_AGE > {age_days}D")

            # 4. Storage impact evidence
            if file_size >= 100 * 1024 * 1024:  # >= 100 MB
                score += self.w_size
                score_breakdown.append({
                    "key": "high_storage_impact",
                    "label": "Large file",
                    "points": self.w_size,
                    "explanation": f"The file is {format_size(file_size)}, at or above the 100 MB large-file threshold.",
                })
                reasons.append("HIGH_STORAGE_IMPACT")
            elif file_size >= 10 * 1024 * 1024:  # >= 10 MB
                score += self.w_size * 0.5
                score_breakdown.append({
                    "key": "moderate_storage_impact",
                    "label": "Moderately large file",
                    "points": self.w_size * 0.5,
                    "explanation": f"The file is {format_size(file_size)}, at or above the 10 MB storage-impact threshold.",
                })
                reasons.append("MODERATE_STORAGE_IMPACT")

            # 5. Recent use penalty
            if node and node.modified_at:
                age_seconds = current_time - node.modified_at.timestamp()
                if age_seconds < 3 * 86400:  # < 3 days
                    score -= self.w_recent
                    score_breakdown.append({
                        "key": "recent_activity",
                        "label": "Recent activity",
                        "points": -self.w_recent,
                        "explanation": "A recent modification lowers this file's priority.",
                    })
                    reasons.append("RECENTLY_MODIFIED")

            clamped_score = int(max(0, min(100, round(score))))

            recommendations.append(
                CleanupRecommendation(
                    id=f"rec-{len(recommendations) + 1:04d}",
                    rank="",
                    impact_score=clamped_score,
                    target_path=path_str,
                    reasons=reasons,
                    bytes=file_size,
                    is_selected=clamped_score >= self.selection_threshold,
                    score_breakdown=score_breakdown,
                    selection_threshold=self.selection_threshold,
                )
            )

        # Sort descending by score
        recommendations.sort(key=lambda r: r.impact_score, reverse=True)

        # Assign ranks
        for idx, rec in enumerate(recommendations, start=1):
            rec.rank = f"RECORD_{idx:02d}"

        return recommendations
