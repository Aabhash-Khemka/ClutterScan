from pathlib import Path
from app.models.file_node import FileNode
from app.models.duplicate_group import DuplicateGroup, DuplicateFileItem
from app.services.recommendation.recommendation_engine import RecommendationEngine

def test_recommendation_scoring_and_ranking():
    """
    Test Algorithm 9:
    - Multiple evidence signals combine into clamped 0-100 score
    - Correct reasons attached (EXACT_DUPLICATE, LOWER_RESOLUTION, HIGH_STORAGE_IMPACT)
    - Results sorted descending by score
    """
    engine = RecommendationEngine()

    file_a = FileNode(id="1", name="photo_low.jpg", path="C:\\test\\photo_low.jpg", size=150 * 1024 * 1024)
    file_b = FileNode(id="2", name="cache.tmp", path="C:\\test\\cache.tmp", size=5 * 1024 * 1024)

    # Duplicate group where photo_low.jpg is lower resolution candidate
    dup_file_item = DuplicateFileItem(
        id="d1",
        name="photo_low.jpg",
        path="C:\\test\\photo_low.jpg",
        size=150 * 1024 * 1024,
        content_hash="HASH1",
        is_preferred=False,
        status="CLEANUP CANDIDATE (MARKED)",
        status_desc="DOWNSAMPLED COMPRESSED DUPLICATE",
    )
    dup_group = DuplicateGroup(
        id="001",
        sector_name="SECTOR_001",
        hash="HASH1",
        short_hash="H1...",
        match_count=2,
        total_bytes=300 * 1024 * 1024,
        files=[dup_file_item],
    )

    old_files = []
    temp_files = [{"path": "C:\\test\\cache.tmp", "ageDays": 20}]

    recs = engine.generate_recommendations(
        files=[file_a, file_b],
        duplicate_groups=[dup_group],
        old_files=old_files,
        temp_files=temp_files,
    )

    assert len(recs) == 2
    # photo_low.jpg should have higher score (duplicate + lower res + high storage impact)
    top_rec = recs[0]
    assert top_rec.target_path == "C:\\test\\photo_low.jpg"
    assert top_rec.rank == "RECORD_01"
    assert "EXACT_DUPLICATE" in top_rec.reasons
    assert "LOWER_RESOLUTION" in top_rec.reasons
    assert "HIGH_STORAGE_IMPACT" in top_rec.reasons
    assert top_rec.impact_score > 60
    assert top_rec.is_selected is True

    # Check order
    assert recs[0].impact_score >= recs[1].impact_score
