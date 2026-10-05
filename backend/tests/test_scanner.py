import pytest
from pathlib import Path
from app.services.scanner.scanner import Scanner
from app.core.exceptions import PathNotFoundError

def test_scanner_with_nested_structure(tmp_path: Path):
    """Test recursive scanning of nested folders and files."""
    # Create test directory structure:
    # root/
    # ├── doc1.txt (100 bytes)
    # ├── sub1/
    # │   └── doc2.pdf (200 bytes)
    # └── sub2/
    #     └── deep/
    #         └── doc3.log (300 bytes)
    (tmp_path / "doc1.txt").write_bytes(b"A" * 100)
    
    sub1 = tmp_path / "sub1"
    sub1.mkdir()
    (sub1 / "doc2.pdf").write_bytes(b"B" * 200)

    sub2 = tmp_path / "sub2" / "deep"
    sub2.mkdir(parents=True)
    (sub2 / "doc3.log").write_bytes(b"C" * 300)

    scanner = Scanner(str(tmp_path))
    root_node = scanner.scan()

    assert root_node.is_directory is True
    assert scanner.total_files_scanned == 3
    assert scanner.total_directories_scanned >= 3
    assert len(scanner.errors) == 0

    # Test dictionary output for frontend
    data = root_node.to_dict()
    assert data["isDir"] is True
    assert "children" in data
    assert len(data["children"]) == 3

def test_scanner_non_existent_path():
    """Test scanner properly raises PathNotFoundError for missing paths."""
    with pytest.raises(PathNotFoundError):
        scanner = Scanner("C:\\Definitely\\NonExistent\\Path\\123456")
        scanner.scan()
