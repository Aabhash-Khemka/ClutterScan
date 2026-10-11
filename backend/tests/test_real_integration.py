"""End-to-End Real Integration Test for ClutterScan.

Tests the full pipeline against an isolated temporary directory with known files:
- report.txt
- report_copy.txt (exact duplicate)
- notes.txt (unique content)
- photos/image_a.png (test image)
- nested folders and logs

Verifies:
1. Path acceptance and scan initiation.
2. Complete filesystem traversal and directory sizing.
3. Accurate SHA-256 duplicate detection (report.txt and report_copy.txt grouped; notes.txt excluded).
4. Asynchronous polling to COMPLETED.
5. SQLite persistence retrieval (works even when in-memory instance cache is cleared).
6. Frontend contract compliance (matching TypeScript types).
7. Safe isolated cleanup to vault and lossless file restoration.
"""

import time
from pathlib import Path
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.pipeline import ScanPipelineManager
from app.database.database import get_db
from app.database.repositories.scan_repository import ScanRepository

client = TestClient(app)


@pytest.fixture
def test_directory(tmp_path: Path) -> Path:
    """Create a structured test directory with known files and duplicates."""
    root = tmp_path / "clutterscan_test_suite"
    root.mkdir()

    # 1. Exact duplicate pair
    report_content = "CONFIDENTIAL INTERNAL AUDIT REPORT\nVERSION 2.0\n" * 50
    report_file = root / "report.txt"
    report_file.write_text(report_content, encoding="utf-8")

    report_copy = root / "report_copy.txt"
    report_copy.write_text(report_content, encoding="utf-8")

    # 2. Unique file with different bytes
    notes_file = root / "notes.txt"
    notes_file.write_text("Unique quick notes for testing.\nDifferent size and checksum.", encoding="utf-8")

    # 3. Temporary / old log file for file analyzer detection
    log_dir = root / "logs"
    log_dir.mkdir()
    log_file = log_dir / "debug.log"
    log_file.write_text("DEBUG 2026-01-01 [TRACE] System initialized.\n" * 20, encoding="utf-8")

    # 4. Valid PNG image inside nested photos folder
    photos_dir = root / "photos"
    photos_dir.mkdir()
    image_a = photos_dir / "image_a.png"
    img = Image.new("RGB", (64, 64), color=(73, 109, 137))
    img.save(image_a, format="PNG")

    return root


def test_real_e2e_scan_pipeline(test_directory: Path):
    """Execute end-to-end scan workflow and verify algorithms and contracts."""
    # 1. Validate System Endpoints
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    vol_res = client.get("/api/system/volumes")
    assert vol_res.status_code == 200
    volumes = vol_res.json()
    assert len(volumes) >= 1
    assert "path" in volumes[0]
    assert "formattedTotal" in volumes[0]

    folder_res = client.get("/api/system/folders")
    assert folder_res.status_code == 200
    folders = folder_res.json()
    assert len(folders) >= 1

    # 2. Initiate Scan Request
    target_str = str(test_directory)
    scan_req = {
        "target_path": target_str,
        "options": {
            "exactDupes": True,
            "similarImages": True,
            "oldFiles": True,
            "tempFiles": True,
            "emptyFolders": True,
        },
    }
    init_res = client.post("/api/scan", json=scan_req)
    assert init_res.status_code == 200
    init_data = init_res.json()
    assert "scanId" in init_data
    scan_id = init_data["scanId"]
    assert init_data["targetPath"] == target_str

    # 3. Poll to Completion
    completed = False
    status_data = {}
    for _ in range(50):
        status_res = client.get(f"/api/scan/{scan_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        if status_data["status"] == "COMPLETED":
            completed = True
            break
        elif status_data["status"] == "FAILED":
            pytest.fail(f"Scan failed with error: {status_data.get('message')}")
        time.sleep(0.1)

    assert completed is True
    assert status_data["totalFiles"] == 5
    assert status_data["totalBytes"] > 0
    assert "formattedSize" in status_data

    # 4. Verify Filesystem Tree Generation
    tree_res = client.get(f"/api/scan/{scan_id}/tree")
    assert tree_res.status_code == 200
    tree = tree_res.json()
    assert len(tree) == 1
    root_node = tree[0]
    assert root_node["isDir"] is True
    assert root_node["bytes"] == status_data["totalBytes"]
    assert len(root_node["children"]) >= 4

    # 5. Verify Exact Duplicate Detection
    dup_res = client.get(f"/api/duplicates/{scan_id}")
    assert dup_res.status_code == 200
    dup_groups = dup_res.json()
    assert len(dup_groups) == 1, f"Expected 1 duplicate group, found {len(dup_groups)}"

    group = dup_groups[0]
    assert "sectorName" in group
    assert group["matchCount"] == 2
    replica_paths = [r["path"] for r in group["files"]]
    assert str(test_directory / "report.txt") in replica_paths
    assert str(test_directory / "report_copy.txt") in replica_paths
    assert str(test_directory / "notes.txt") not in replica_paths

    # 6. Verify File Analysis Metadata (Old & Temp Files)
    files_res = client.get(f"/api/files/{scan_id}")
    assert files_res.status_code == 200
    analyzed_files = files_res.json()
    assert isinstance(analyzed_files, list)

    # 7. Verify Recommendations
    recs_res = client.get(f"/api/recommendations/{scan_id}")
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert isinstance(recs, list)
    assert len(recs) >= 1
    for rec in recs:
        assert "id" in rec
        assert "targetPath" in rec
        assert "bytes" in rec
        assert "reasons" in rec
        assert "impactScore" in rec

    # 8. Verify SQLite Persistence Survives In-Memory Cache Eviction
    # Clear in-memory pipeline instances to simulate app/server restart
    ScanPipelineManager._instances.clear()

    # Re-fetch from endpoints (must transparently query SQLite)
    persisted_tree_res = client.get(f"/api/scan/{scan_id}/tree")
    assert persisted_tree_res.status_code == 200
    persisted_tree = persisted_tree_res.json()
    assert len(persisted_tree) == 1
    assert persisted_tree[0]["bytes"] == status_data["totalBytes"]

    persisted_dups_res = client.get(f"/api/duplicates/{scan_id}")
    assert persisted_dups_res.status_code == 200
    persisted_dups = persisted_dups_res.json()
    assert len(persisted_dups) == 1
    assert persisted_dups[0]["matchCount"] == 2

    persisted_recs_res = client.get(f"/api/recommendations/{scan_id}")
    assert persisted_recs_res.status_code == 200
    persisted_recs = persisted_recs_res.json()
    assert len(persisted_recs) == len(recs)

    # Latest scan session endpoint
    latest_res = client.get("/api/scan/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["scanId"] == scan_id
    assert latest_data["status"] == "COMPLETED"

    # 9. Verify Safe Cleanup Preview, Confirmation, and Lossless Recovery
    target_to_clean = test_directory / "report_copy.txt"
    assert target_to_clean.exists()
    cleanup_payload = {
        "candidates": [
            {
                "id": "test-cand-01",
                "targetPath": str(target_to_clean),
                "bytes": target_to_clean.stat().st_size,
            }
        ],
        "preferTrash": False,  # Routes to local recovery vault
    }

    # Pre-flight preview
    prev_res = client.post("/api/cleanup/preview", json=cleanup_payload)
    assert prev_res.status_code == 200
    assert prev_res.json()["validCount"] == 1
    assert prev_res.json()["totalBytes"] == target_to_clean.stat().st_size

    # Execution confirmation
    confirm_res = client.post("/api/cleanup/confirm", json=cleanup_payload)
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["success"] is True
    assert len(confirm_data["results"]) == 1
    recovery_entry = confirm_data["results"][0]
    action_id = recovery_entry["id"]

    # Target file should now be migrated out of original directory
    assert not target_to_clean.exists(), "Target file must be removed from original location after cleanup"

    # Lossless Restore Execution
    restore_res = client.post(f"/api/recovery/{action_id}/restore")
    assert restore_res.status_code == 200
    assert restore_res.json()["success"] is True
    assert target_to_clean.exists(), "Target file must be perfectly restored to original path"
    assert target_to_clean.read_text(encoding="utf-8") == (test_directory / "report.txt").read_text(encoding="utf-8")
