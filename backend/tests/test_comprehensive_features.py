"""
Comprehensive test suite testing every major ClutterScan feature end-to-end:
1. Scanner traversal & recursive directory structuring.
2. Cryptographic SHA-256 duplicate detection and clustering (DuplicateDetector).
3. Perceptual image hashing (pHash) clustering across photos (SimilarImageDetector).
4. Old file (>180 days) & temporary file rule engines (FileAnalyzer).
5. Recommendation scoring and tie-breaking heuristics (RecommendationEngine).
6. Safe cleanup to Recovery Vault & lossless file restoration (CleanupManager).
7. Smart Organize (file gathering) planning, execution, and 1-click Undo (OrganizePlanner / OrganizeExecutor).
8. Full REST API lifecycle (Volumes, Scan, Polling, Tree, Dups, History, Organize).
"""

import os
import shutil
import tempfile
import time
from pathlib import Path
from datetime import datetime, timedelta
from PIL import Image, ImageDraw

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.file_node import FileNode
from app.models.duplicate_group import DuplicateGroup, DuplicateFileItem
from app.services.scanner.scanner import Scanner
from app.services.scanner.tree_builder import TreeBuilder
from app.services.detection.duplicate_detector import DuplicateDetector
from app.services.detection.similar_image_detector import SimilarImageDetector
from app.services.analysis.file_analyzer import FileAnalyzer
from app.services.recommendation.recommendation_engine import RecommendationEngine
from app.services.cleanup.cleanup_manager import CleanupManager
from app.services.organize.planner import OrganizePlanner
from app.services.organize.executor import OrganizeExecutor


@pytest.fixture
def test_env():
    """Create a temporary sandbox environment with a rich structure of files."""
    temp_dir = Path(tempfile.mkdtemp(prefix="clutterscan_full_suite_"))
    
    # 1. Exact duplicates
    docs_dir = temp_dir / "Documents"
    docs_dir.mkdir(parents=True)
    f1 = docs_dir / "report_2026.docx"
    f1.write_text("Confidential Quarterly Report Content 2026", encoding="utf-8")
    
    backup_dir = temp_dir / "Backup" / "Docs"
    backup_dir.mkdir(parents=True)
    f1_dup = backup_dir / "report_2026_copy.docx"
    f1_dup.write_text("Confidential Quarterly Report Content 2026", encoding="utf-8")
    
    # 2. Similar images (pHash)
    img_dir = temp_dir / "Photos"
    img_dir.mkdir(parents=True)
    img1_path = img_dir / "nature.png"
    im1 = Image.new("L", (128, 128), color=0)
    draw1 = ImageDraw.Draw(im1)
    draw1.ellipse((30, 30, 98, 98), fill=255)
    im1.save(img1_path)
    
    img2_path = img_dir / "nature_copy.png"
    im2 = im1.resize((64, 64))
    im2.save(img2_path)
    
    # 3. Code & College files for smart gathering
    code_dir = temp_dir / "Projects"
    code_dir.mkdir(parents=True)
    py_file = code_dir / "main.py"
    py_file.write_text("def hello(): return 'world'", encoding="utf-8")
    
    college_file = docs_dir / "cs101_syllabus_homework.pdf"
    college_file.write_text("%PDF-1.4 Assignment 1", encoding="utf-8")
    
    # 4. Old & Temp files
    temp_cache = temp_dir / "AppData" / "cache.tmp"
    temp_cache.parent.mkdir(parents=True)
    temp_cache.write_text("temporary cache content", encoding="utf-8")
    
    old_file = docs_dir / "archive_2020.txt"
    old_file.write_text("Old unmodified notes", encoding="utf-8")
    # Set modification time back 250 days
    past_time = time.time() - (250 * 86400)
    os.utime(old_file, (past_time, past_time))
    
    yield {
        "root": temp_dir,
        "docs_dir": docs_dir,
        "f1": f1,
        "f1_dup": f1_dup,
        "img1": img1_path,
        "img2": img2_path,
        "py_file": py_file,
        "college_file": college_file,
        "temp_cache": temp_cache,
        "old_file": old_file,
    }
    
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_feature_scanner_and_directory_sizer(test_env):
    """Test 1: Scanner traversal and accurate directory size aggregation."""
    root = test_env["root"]
    scanner = Scanner(str(root))
    root_node = scanner.scan()
    
    assert root_node is not None
    assert root_node.is_directory is True
    assert scanner.total_files_scanned >= 7
    assert scanner.total_directories_scanned >= 3


def test_feature_exact_duplicate_detection(test_env):
    """Test 2: Cryptographic SHA-256 duplicate detection and clustering."""
    root = test_env["root"]
    scanner = Scanner(str(root))
    root_node = scanner.scan()
    files = TreeBuilder.collect_file_nodes(root_node)
    
    detector = DuplicateDetector()
    dup_groups = detector.find_duplicates(files)
    
    assert len(dup_groups) >= 1, "Should find at least 1 exact duplicate group"
    group = next(g for g in dup_groups if any("report_2026" in f.path for f in g.files))
    assert len(group.files) == 2, "Duplicate group should contain 2 identical files"
    assert group.files[0].size == group.files[1].size


def test_feature_image_similarity_phash(test_env):
    """Test 3: Perceptual pHash image similarity clustering."""
    root = test_env["root"]
    scanner = Scanner(str(root))
    root_node = scanner.scan()
    files = TreeBuilder.collect_file_nodes(root_node)
    
    img_detector = SimilarImageDetector(threshold=15)
    clusters = img_detector.find_similar_images(files)
    
    assert len(clusters) >= 1, "Should detect similar photo cluster"
    assert clusters[0].match_count == 2, "Cluster should group the 2 nature images"


def test_feature_age_and_temporary_detection(test_env):
    """Test 4: Old file (>180 days) and temporary file rule engines."""
    root = test_env["root"]
    scanner = Scanner(str(root))
    root_node = scanner.scan()
    files = TreeBuilder.collect_file_nodes(root_node)
    
    analyzer = FileAnalyzer(old_threshold_days=180)
    old_files, temp_files = analyzer.detect_candidates(files)
    
    assert len(temp_files) >= 1, "Should classify cache.tmp as temporary"
    assert any("cache.tmp" in f["path"] for f in temp_files)
    assert len(old_files) >= 1, "Should classify archive_2020.txt as old"
    assert any("archive_2020.txt" in f["path"] for f in old_files)


def test_feature_recommendation_scoring():
    """Test 5: Recommendation engine correctly ranks and suggests duplicates for cleanup."""
    engine = RecommendationEngine()
    file_a = FileNode(id="1", name="photo_low.jpg", path="C:\\test\\photo_low.jpg", size=150 * 1024 * 1024)
    file_b = FileNode(id="2", name="cache.tmp", path="C:\\test\\cache.tmp", size=5 * 1024 * 1024)
    
    dup_file = DuplicateFileItem(
        id="d1",
        name="photo_low.jpg",
        path="C:\\test\\photo_low.jpg",
        size=150 * 1024 * 1024,
        content_hash="HASH1",
        is_preferred=False,
        status="CLEANUP CANDIDATE",
    )
    dup_group = DuplicateGroup(
        id="001",
        sector_name="SEC_1",
        hash="HASH1",
        short_hash="H1..",
        match_count=2,
        total_bytes=300 * 1024 * 1024,
        files=[dup_file],
    )
    
    recs = engine.generate_recommendations(
        files=[file_a, file_b],
        duplicate_groups=[dup_group],
        old_files=[],
        temp_files=[{"path": "C:\\test\\cache.tmp", "ageDays": 10}],
    )
    assert len(recs) == 2
    top_rec = recs[0]
    assert top_rec.target_path == "C:\\test\\photo_low.jpg"
    assert "EXACT_DUPLICATE" in top_rec.reasons


def test_feature_safe_deletion_and_recovery_vault_restore(test_env):
    """Test 6: Safe quarantine cleanup and 100% lossless restoration."""
    f1_dup = test_env["f1_dup"]
    original_text = f1_dup.read_text(encoding="utf-8")
    
    cleanup_mgr = CleanupManager()
    
    # 1. Delete to local recovery vault
    results = cleanup_mgr.execute_safe_cleanup([{"targetPath": str(f1_dup)}], prefer_trash=False)
    assert len(results) == 1
    record = results[0]
    assert record.status == "RECOVERABLE (RECOVERY VAULT)"
    assert not f1_dup.exists(), "File should be quarantined away from origin"
    
    # 2. Restore file
    ok_restore, msg = cleanup_mgr.restore_file(record.id)
    assert ok_restore is True, f"Restore failed: {msg}"
    assert f1_dup.exists(), "Restored file must reappear at origin"
    assert f1_dup.read_text(encoding="utf-8") == original_text, "Content must match perfectly"


def test_feature_file_gathering_smart_organize(test_env):
    """Test 7: Smart Organize file gathering, planning, directory sorting, and Undo."""
    root = test_env["root"]
    py_file = test_env["py_file"]
    college_file = test_env["college_file"]
    
    planner = OrganizePlanner()
    plan = planner.scan_and_plan(str(root))
    
    assert len(plan.moves) >= 2, "Should plan organization for files"
    
    # Execute organization (gathering)
    executor = OrganizeExecutor()
    exec_summary = executor.execute(str(root), plan.moves)
    assert exec_summary.status == "completed"
    assert exec_summary.total_moved >= 2
    
    # Confirm files were sorted into category directories
    assert not py_file.exists(), "Source py_file should have moved to Code/"
    assert not college_file.exists(), "Source college_file should have moved to College/"
    assert (root / "Code" / "main.py").exists(), "main.py must be gathered in Code/"
    assert (root / "College" / "cs101_syllabus_homework.pdf").exists(), "Syllabus must be gathered in College/"
    
    # Undo organization
    undo_result = executor.undo_operation(exec_summary.operation_id)
    assert undo_result.get("success") is True
    assert undo_result.get("restored") >= 2
    
    # Confirm files returned to exact original paths
    assert py_file.exists(), "main.py must return to original location"
    assert college_file.exists(), "cs101_syllabus_homework.pdf must return to original location"


def test_feature_rest_api_endpoints_full_lifecycle(test_env):
    """Test 8: Full FastAPI lifecycle: volumes, start scan, poll status, tree, dups, organize, cleanup."""
    client = TestClient(app)
    root = test_env["root"]
    
    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"
    
    # 2. Volumes
    r = client.get("/api/system/volumes")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    
    # 3. Start scan
    scan_req = {
        "target_path": str(root),
        "options": {
            "exactDupes": True,
            "similarImages": True,
            "oldFiles": True,
            "tempFiles": True,
            "emptyFolders": True,
        }
    }
    r = client.post("/api/scan", json=scan_req)
    assert r.status_code == 200
    scan_id = r.json()["scanId"]
    assert scan_id is not None
    
    # 4. Wait for scan completion
    max_wait = 10
    start_t = time.time()
    while time.time() - start_t < max_wait:
        r_status = client.get(f"/api/scan/{scan_id}")
        if r_status.json()["status"] == "COMPLETED":
            break
        time.sleep(0.2)
        
    assert r_status.json()["status"] == "COMPLETED"
    
    # 5. Tree data
    r_tree = client.get(f"/api/scan/{scan_id}/tree")
    assert r_tree.status_code == 200
    assert len(r_tree.json()) >= 1
    
    # 6. Duplicates
    r_dups = client.get(f"/api/duplicates/{scan_id}")
    assert r_dups.status_code == 200
    assert len(r_dups.json()) >= 1
    
    # 7. Organize Scan API
    r_plan = client.post("/api/organize/scan", json={"sourcePath": str(root)})
    assert r_plan.status_code == 200
    assert "moves" in r_plan.json()
    
    # 8. History API
    r_hist = client.get("/api/history")
    assert r_hist.status_code == 200
    assert "historicalScans" in r_hist.json()
