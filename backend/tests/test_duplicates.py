from pathlib import Path
from app.models.file_node import FileNode
from app.services.detection.duplicate_detector import DuplicateDetector

def test_exact_duplicate_detection(tmp_path: Path):
    """
    Test Algorithm 3:
    - Same-size files with identical content -> grouped into duplicate group
    - Different-size files -> rejected by size pre-filter
    - Same-size files with different content -> separated by hash
    """
    # 1. Create duplicate pair A & B
    file_a = tmp_path / "original.dat"
    file_b = tmp_path / "copy.dat"
    content_dup = b"IDENTICAL_CONTENT_BYTES_12345"
    file_a.write_bytes(content_dup)
    file_b.write_bytes(content_dup)

    # 2. Create file with different size
    file_c = tmp_path / "different_size.dat"
    file_c.write_bytes(b"SHORT")

    # 3. Create file with same size but different content
    file_d = tmp_path / "same_size_diff_content.dat"
    file_d.write_bytes(b"DIFFERENT_CONTENT_BYTES_99999")

    nodes = [
        FileNode(id="1", name="original.dat", path=str(file_a), size=len(content_dup)),
        FileNode(id="2", name="copy.dat", path=str(file_b), size=len(content_dup)),
        FileNode(id="3", name="different_size.dat", path=str(file_c), size=5),
        FileNode(id="4", name="same_size_diff_content.dat", path=str(file_d), size=len(content_dup)),
    ]

    detector = DuplicateDetector()
    groups = detector.find_duplicates(nodes)

    assert len(groups) == 1
    dup_group = groups[0]
    assert dup_group.match_count == 2
    assert len(dup_group.files) == 2
    paths = [f.path for f in dup_group.files]
    assert str(file_a) in paths
    assert str(file_b) in paths
    assert str(file_c) not in paths
    assert str(file_d) not in paths
    assert len(dup_group.hex_sample) > 0
