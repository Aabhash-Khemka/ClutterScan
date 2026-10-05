from fastapi.testclient import TestClient
from pathlib import Path
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ClutterScan"

def test_system_volumes():
    response = client.get("/api/system/volumes")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "path" in data[0]
        assert "formattedTotal" in data[0]

def test_end_to_end_scan_api(tmp_path: Path):
    """Test POST /api/scan, GET /api/scan/{id}, and GET /api/scan/{id}/tree."""
    # Create test folder with a few files
    (tmp_path / "file1.txt").write_text("Hello World 1")
    (tmp_path / "file2.txt").write_text("Hello World 2")
    sub = tmp_path / "subdir"
    sub.mkdir()
    (sub / "subfile.txt").write_text("Nested File")

    # Start scan
    post_res = client.post(
        "/api/scan",
        json={"target_path": str(tmp_path), "options": {"exactDupes": True}},
    )
    assert post_res.status_code == 200
    scan_id = post_res.json()["scanId"]
    assert scan_id is not None

    # Wait for completion or check status
    import time
    for _ in range(20):
        status_res = client.get(f"/api/scan/{scan_id}")
        assert status_res.status_code == 200
        if status_res.json()["status"] == "COMPLETED":
            break
        time.sleep(0.1)

    json_res = status_res.json()
    assert json_res["status"] == "COMPLETED", f"Expected COMPLETED but got {json_res['status']}: {json_res.get('message')}"
    assert status_res.json()["totalFiles"] == 3

    # Check tree endpoint
    tree_res = client.get(f"/api/scan/{scan_id}/tree")
    assert tree_res.status_code == 200
    tree_data = tree_res.json()
    assert isinstance(tree_data, list)
    assert len(tree_data) == 1
    assert tree_data[0]["isDir"] is True

    # Check duplicates endpoint
    dup_res = client.get(f"/api/duplicates/{scan_id}")
    assert dup_res.status_code == 200

    # Check similar images endpoint
    sim_res = client.get(f"/api/similar-images/{scan_id}")
    assert sim_res.status_code == 200

    # Check files endpoint
    files_res = client.get(f"/api/files/{scan_id}")
    assert files_res.status_code == 200

    # Check recommendations endpoint
    rec_res = client.get(f"/api/recommendations/{scan_id}")
    assert rec_res.status_code == 200

    # Check history endpoint
    hist_res = client.get("/api/history")
    assert hist_res.status_code == 200
    assert "historicalScans" in hist_res.json()

    # Test cleanup preview and confirm
    file_to_clean = tmp_path / "file1.txt"
    cleanup_req = {
        "candidates": [
            {
                "id": "rec-1",
                "targetPath": str(file_to_clean),
                "bytes": file_to_clean.stat().st_size,
            }
        ],
        "preferTrash": False,
    }
    prev_res = client.post("/api/cleanup/preview", json=cleanup_req)
    assert prev_res.status_code == 200
    assert prev_res.json()["validCount"] == 1

    confirm_res = client.post("/api/cleanup/confirm", json=cleanup_req)
    assert confirm_res.status_code == 200
    clean_data = confirm_res.json()
    assert clean_data["success"] is True
    assert len(clean_data["results"]) == 1
    action_id = clean_data["results"][0]["id"]

    # Test recovery restore
    restore_res = client.post(f"/api/recovery/{action_id}/restore")
    assert restore_res.status_code == 200
    assert restore_res.json()["success"] is True
    assert file_to_clean.exists()
