import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.models.file_node import FileNode
from app.models.duplicate_group import DuplicateGroup
from app.models.cleanup_recommendation import CleanupRecommendation
from app.core.config import settings

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

            # 1. Duplicate evidence
            if path_str in dup_candidate_map:
                score += self.w_dup
                reasons.append("EXACT_DUPLICATE")
                if dup_candidate_map[path_str]["is_lower_res"]:
                    score += self.w_res
                    reasons.append("LOWER_RESOLUTION")

            # 2. Temporary evidence
            if path_str in temp_map:
                score += self.w_temp
                reasons.append("TEMPORARY_ARTIFACT")

            # 3. Age evidence
            if path_str in old_map:
                score += self.w_age
                age_days = old_map[path_str].get("ageDays", 180)
                reasons.append(f"UNRESOLVED_INODE_AGE > {age_days}D")

            # 4. Storage impact evidence
            if file_size >= 100 * 1024 * 1024:  # >= 100 MB
                score += self.w_size
                reasons.append("HIGH_STORAGE_IMPACT")
            elif file_size >= 10 * 1024 * 1024:  # >= 10 MB
                score += self.w_size * 0.5
                reasons.append("MODERATE_STORAGE_IMPACT")

            # 5. Recent use penalty
            if node and node.modified_at:
                age_seconds = current_time - node.modified_at.timestamp()
                if age_seconds < 3 * 86400:  # < 3 days
                    score -= self.w_recent

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
                )
            )

        # Sort descending by score
        recommendations.sort(key=lambda r: r.impact_score, reverse=True)

        # Assign ranks
        for idx, rec in enumerate(recommendations, start=1):
            rec.rank = f"RECORD_{idx:02d}"

        return recommendations
