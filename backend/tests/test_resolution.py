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


def test_non_image_reference_explains_the_path_and_name_heuristic():
    files = [
        DuplicateFileItem(
            id="preferred",
            name="original.bin",
            path="C:\\Data\\Documents\\original.bin",
            size=100,
            content_hash="same-hash",
        ),
        DuplicateFileItem(
            id="candidate",
            name="copy.bin",
            path="C:\\Data\\Downloads\\copy.bin",
            size=100,
            content_hash="same-hash",
        ),
    ]

    preferred, candidates = ResolutionDetector.evaluate_group_resolutions(files)

    assert preferred.name == "original.bin"
    assert "path/name score of 100/100" in preferred.rationale
    assert "does not know which copy you prefer" in preferred.rationale
    assert candidates[0].name == "copy.bin"
    assert "path/name score of 30/100" in candidates[0].rationale
    assert "path contains Downloads (-40)" in candidates[0].rationale
    assert "name contains '(1)' or 'copy' (-30)" in candidates[0].rationale


def test_tied_non_image_paths_explain_reference_ordering():
    files = [
        DuplicateFileItem(
            id="first",
            name="first.bin",
            path="C:\\Data\\first.bin",
            size=100,
            content_hash="same-hash",
        ),
        DuplicateFileItem(
            id="second",
            name="second.bin",
            path="C:\\Data\\second.bin",
            size=100,
            content_hash="same-hash",
        ),
    ]

    preferred, candidates = ResolutionDetector.evaluate_group_resolutions(files)

    assert preferred.name == "first.bin"
    assert "first matching file in scan order" in candidates[0].rationale
    assert "not a user preference" in candidates[0].rationale
