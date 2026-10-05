import time
from datetime import datetime, timedelta
from pathlib import Path
from app.models.file_node import FileNode
from app.services.analysis.file_analyzer import FileAnalyzer

def test_old_and_temporary_detection():
    """
    Test Algorithm 6:
    - File older than ageThreshold -> flagged as old
    - File with .tmp extension -> flagged as temporary
    - File in Temp directory -> flagged as temporary
    - Recent standard file -> not flagged
    """
    now = datetime.now()
    two_years_ago = now - timedelta(days=730)
    ten_days_ago = now - timedelta(days=10)

    analyzer = FileAnalyzer(old_threshold_days=180)

    nodes = [
        # Old file
        FileNode(
            id="f1",
            name="archive_2024.zip",
            path="C:\\Users\\Operator\\Documents\\archive_2024.zip",
            size=1024 * 1024 * 50,
            modified_at=two_years_ago,
        ),
        # Temporary file by extension
        FileNode(
            id="f2",
            name="cache_scratch.tmp",
            path="C:\\Users\\Operator\\Downloads\\cache_scratch.tmp",
            size=1024 * 1024 * 10,
            modified_at=ten_days_ago,
        ),
        # Temporary file by location
        FileNode(
            id="f3",
            name="system_trace.log",
            path="C:\\Windows\\Temp\\system_trace.log",
            size=1024 * 1024 * 5,
            modified_at=ten_days_ago,
        ),
        # Recent normal file
        FileNode(
            id="f4",
            name="current_project.docx",
            path="C:\\Users\\Operator\\Documents\\current_project.docx",
            size=1024 * 100,
            modified_at=ten_days_ago,
        ),
    ]

    old_files, temp_files = analyzer.detect_candidates(nodes, current_time=now.timestamp())

    # Check old files
    assert len(old_files) == 1
    assert old_files[0]["path"] == "C:\\Users\\Operator\\Documents\\archive_2024.zip"
    assert "DAYS" in old_files[0]["inodeAge"]
    assert old_files[0]["type"] == "ARCHIVE"

    # Check temp files
    temp_paths = [t["path"] for t in temp_files]
    assert "C:\\Users\\Operator\\Downloads\\cache_scratch.tmp" in temp_paths
    assert "C:\\Windows\\Temp\\system_trace.log" in temp_paths
    assert "C:\\Users\\Operator\\Documents\\current_project.docx" not in temp_paths

    # Check unified metadata output
    unified = analyzer.get_unified_metadata_items(nodes)
    assert len(unified) == 3
    for item in unified:
        assert "id" in item
        assert "inodeAge" in item
        assert "type" in item
        assert "size" in item
        assert "bytes" in item
        assert "reason" in item
        assert "isStaged" in item
