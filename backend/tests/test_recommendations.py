from pathlib import Path
import sqlite3
from app.models.file_node import FileNode
from app.models.duplicate_group import DuplicateGroup, DuplicateFileItem
from app.models.cleanup_recommendation import CleanupRecommendation
from app.database.database import init_db
from app.database.repositories.scan_repository import ScanRepository
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
    assert top_rec.selection_threshold == 60
    assert top_rec.score_breakdown == [
        {
            "key": "exact_duplicate",
            "label": "Exact duplicate",
            "points": 35.0,
            "explanation": "The file has the same SHA-256 content hash as another file.",
        },
        {
            "key": "lower_resolution",
            "label": "Lower-resolution copy",
            "points": 20.0,
            "explanation": "Another identical image copy has a higher pixel resolution.",
        },
        {
            "key": "high_storage_impact",
            "label": "Large file",
            "points": 10.0,
            "explanation": "The file is 150.0 MB, at or above the 100 MB large-file threshold.",
        },
    ]
    assert top_rec.to_dict()["scoreBeforeClamp"] == 65.0

    # Check order
    assert recs[0].impact_score >= recs[1].impact_score


def test_recent_modification_is_shown_as_a_score_penalty():
    from datetime import datetime, timezone

    recent_file = FileNode(
        id="recent",
        name="recent.tmp",
        path="C:\\test\\recent.tmp",
        size=2 * 1024 * 1024,
        modified_at=datetime.fromtimestamp(1_700_000_000, tz=timezone.utc),
    )
    recommendations = RecommendationEngine(
        w_temp=20, w_recent=15
    ).generate_recommendations(
        files=[recent_file],
        duplicate_groups=[],
        old_files=[],
        temp_files=[{"path": recent_file.path}],
        current_time=1_700_000_001,
    )

    recommendation = recommendations[0]
    assert recommendation.impact_score == 5
    assert "RECENTLY_MODIFIED" in recommendation.reasons
    assert recommendation.score_breakdown[-1]["points"] == -15
    assert recommendation.to_dict()["scoreBeforeClamp"] == 5


def test_existing_recommendation_table_migrates_and_persists_score_explanation(tmp_path: Path):
    db_file = tmp_path / "legacy_scan.db"
    with sqlite3.connect(db_file) as conn:
        conn.execute(
            """
            CREATE TABLE recommendations (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                rank_label TEXT NOT NULL,
                target_path TEXT NOT NULL,
                score INTEGER NOT NULL,
                reasons TEXT NOT NULL,
                recoverable_bytes INTEGER NOT NULL,
                is_selected INTEGER DEFAULT 0
            )
            """
        )

    init_db(db_file)
    repository = ScanRepository(db_path=db_file)
    recommendation = CleanupRecommendation(
        id="rec-1",
        rank="RECORD_01",
        impact_score=65,
        target_path="C:\\test\\photo.jpg",
        reasons=["EXACT_DUPLICATE"],
        bytes=150 * 1024 * 1024,
        is_selected=True,
        score_breakdown=[
            {
                "key": "exact_duplicate",
                "label": "Exact duplicate",
                "points": 35.0,
                "explanation": "The file has the same SHA-256 content hash as another file.",
            }
        ],
        selection_threshold=60,
    )

    repository.save_recommendations("scan-1", [recommendation])
    loaded = repository.get_recommendations("scan-1")

    assert len(loaded) == 1
    assert loaded[0].score_breakdown == recommendation.score_breakdown
    assert loaded[0].selection_threshold == recommendation.selection_threshold
