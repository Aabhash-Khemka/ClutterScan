import pytest
from pathlib import Path
from datetime import datetime
from app.database.database import init_db
from app.models.storage_snapshot import StorageSnapshot
from app.services.snapshot.snapshot_manager import SnapshotManager

def test_snapshot_creation_and_comparison(tmp_path: Path):
    """
    Test Algorithm 8:
    - Snapshot creation in SQLite
    - Directory size delta comparison (EXPANDED vs CONTRACTED)
    - Correct positive/negative storage delta reported
    """
    db_file = tmp_path / "test_clutterscan.db"
    init_db(db_file)

    from app.models.scan_session import ScanSession
    from app.database.repositories.scan_repository import ScanRepository

    repo = ScanRepository(db_path=db_file)
    repo.create_session(ScanSession(id="scan-001", root_path="C:\\Users\\Operator", start_time=datetime.now()))
    repo.create_session(ScanSession(id="scan-002", root_path="C:\\Users\\Operator", start_time=datetime.now()))

    # First scan snapshot
    dir_sizes_1 = {
        "C:\\Users\\Operator\\Downloads": 10 * 1024 * 1024 * 1024,  # 10 GB
        "C:\\Users\\Operator\\Projects": 5 * 1024 * 1024 * 1024,    # 5 GB
    }
    snap1 = SnapshotManager.create_snapshot(
        scan_id="scan-001",
        root_path="C:\\Users\\Operator",
        total_inodes=5000,
        directory_sizes=dir_sizes_1,
        db_path=db_file,
    )

    # Second scan snapshot (Downloads increased by 2GB, Projects decreased by 1GB)
    dir_sizes_2 = {
        "C:\\Users\\Operator\\Downloads": 12 * 1024 * 1024 * 1024,  # 12 GB (+2 GB)
        "C:\\Users\\Operator\\Projects": 4 * 1024 * 1024 * 1024,    # 4 GB (-1 GB)
    }
    snap2 = SnapshotManager.create_snapshot(
        scan_id="scan-002",
        root_path="C:\\Users\\Operator",
        total_inodes=5500,
        directory_sizes=dir_sizes_2,
        db_path=db_file,
    )

    deltas = SnapshotManager.compare_snapshots(snap1, snap2)
    assert len(deltas) == 2

    # First item should be the largest absolute change (Downloads +2GB)
    assert "DOWNLOADS" in deltas[0].directory
    assert deltas[0].direction == "EXPANDED"
    assert deltas[0].is_positive is True
    assert "+ 2.00 GB" in deltas[0].delta

    # Second item should be Projects (-1GB)
    assert "PROJECTS" in deltas[1].directory
    assert deltas[1].direction == "CONTRACTED"
    assert deltas[1].is_positive is False
    assert "- 1.00 GB" in deltas[1].delta

    # Test historical scans retrieval
    scans = SnapshotManager.get_historical_scans(db_path=db_file)
    assert len(scans) == 2
    assert scans[0].id == snap2.id
    assert scans[1].id == snap1.id
    assert ":" in scans[0].date
