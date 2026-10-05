from pathlib import Path
from app.services.scanner.scanner import Scanner
from app.services.scanner.tree_builder import TreeBuilder

def test_directory_size_aggregation(tmp_path: Path):
    """
    Test Algorithm 2: Post-order recursive size calculation.
    Matches test case from Algorithm Specification:
    Documents
    ├── report.pdf 2000 bytes
    ├── notes.docx 1000 bytes
    └── Projects
        └── source.zip 4000 bytes
    Projects.aggregateSize = 4000
    Documents.aggregateSize = 7000
    """
    docs_dir = tmp_path / "Documents"
    docs_dir.mkdir()
    (docs_dir / "report.pdf").write_bytes(b"X" * 2000)
    (docs_dir / "notes.docx").write_bytes(b"Y" * 1000)

    projects_dir = docs_dir / "Projects"
    projects_dir.mkdir()
    (projects_dir / "source.zip").write_bytes(b"Z" * 4000)

    scanner = Scanner(str(docs_dir))
    root_node = scanner.scan()

    assert root_node.aggregate_size == 7000
    
    # Check Projects subfolder size
    projects_node = next(c for c in root_node.children if "Projects" in c.name)
    assert projects_node.aggregate_size == 4000

    # Test TreeBuilder collect methods
    all_files = TreeBuilder.collect_file_nodes(root_node)
    assert len(all_files) == 3
    assert sum(f.size for f in all_files) == 7000

    all_dirs = TreeBuilder.collect_directory_nodes(root_node)
    assert len(all_dirs) == 2  # Documents (root) and Projects (child)
