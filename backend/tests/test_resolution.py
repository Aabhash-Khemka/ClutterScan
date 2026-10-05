from pathlib import Path
from PIL import Image
from app.models.duplicate_group import DuplicateFileItem
from app.services.detection.resolution_detector import ResolutionDetector

def test_resolution_aware_duplicate_selection(tmp_path: Path):
    """
    Test Algorithm 4 / Resolution-Aware Duplicate Selection:
    1920x1080 vs 1280x720
    Preferred: 1920x1080
    Cleanup candidate: 1280x720
    """
    high_res_path = tmp_path / "photo_high.jpg"
    low_res_path = tmp_path / "photo_low.jpg"

    # Create dummy images with PIL
    img_high = Image.new("RGB", (1920, 1080), color=(128, 128, 128))
    img_high.save(high_res_path, format="JPEG")

    img_low = Image.new("RGB", (1280, 720), color=(128, 128, 128))
    img_low.save(low_res_path, format="JPEG")

    file_items = [
        DuplicateFileItem(
            id="f1",
            name="photo_low.jpg",
            path=str(low_res_path),
            size=low_res_path.stat().st_size,
            content_hash="DUMMY_HASH",
        ),
        DuplicateFileItem(
            id="f2",
            name="photo_high.jpg",
            path=str(high_res_path),
            size=high_res_path.stat().st_size,
            content_hash="DUMMY_HASH",
        ),
    ]

    preferred, candidates = ResolutionDetector.evaluate_group_resolutions(file_items)

    assert preferred.name == "photo_high.jpg"
    assert preferred.is_preferred is True
    assert preferred.resolution == "1920 \u00d7 1080"
    assert "PREFERRED" in preferred.status

    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate.name == "photo_low.jpg"
    assert candidate.is_preferred is False
    assert candidate.resolution == "1280 \u00d7 720"
    assert "CLEANUP CANDIDATE" in candidate.status
    assert "DOWNSAMPLED COMPRESSED DUPLICATE" in candidate.status_desc
