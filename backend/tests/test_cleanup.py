from pathlib import Path
from app.database.database import init_db
from app.services.cleanup.cleanup_manager import CleanupManager
from app.services.cleanup.recovery_manager import RecoveryManager

def test_safe_cleanup_and_restore(tmp_path: Path):
    """
    Test Algorithm 10:
    - Pre-flight safety check
    - Reversible migration to recovery vault
    - Lossless restore to original path
    - Audit logging
    """
    db_file = tmp_path / "cleanup_test.db"
    init_db(db_file)

    vault_dir = tmp_path / "test_recovery_vault"
    recovery_mgr = RecoveryManager(vault_dir=vault_dir)
    cleanup_mgr = CleanupManager(recovery_manager=recovery_mgr)

    # Create dummy files to clean up
    file_to_clean = tmp_path / "obsolete_cache.tmp"
    file_to_clean.write_bytes(b"TEMPORARY_DATA_BYTES")
    file_size = file_to_clean.stat().st_size

    # 1. Test missing file validation
    missing_path = tmp_path / "non_existent.tmp"
    res_missing = cleanup_mgr.execute_safe_cleanup(
        targets=[{"targetPath": str(missing_path), "bytes": 100}],
        prefer_trash=False,
        db_path=db_file,
    )
    assert len(res_missing) == 1
    assert "FAILED" in res_missing[0].status

    # 2. Test successful reversible cleanup of valid file
    res_valid = cleanup_mgr.execute_safe_cleanup(
        targets=[{"targetPath": str(file_to_clean), "bytes": file_size}],
        prefer_trash=False,  # Force vault for controlled restore testing
        db_path=db_file,
    )
    assert len(res_valid) == 1
    action_item = res_valid[0]
    assert "RECOVERABLE" in action_item.status
    assert not file_to_clean.exists()  # Original file moved
    assert Path(action_item.recovery_path).exists()  # Vault file exists

    # 3. Test restoration
    ok, msg = cleanup_mgr.restore_file(action_item.id, db_path=db_file)
    assert ok is True
    assert file_to_clean.exists()  # Restored!
    assert file_to_clean.read_bytes() == b"TEMPORARY_DATA_BYTES"

    # 4. Check audit log
    log = cleanup_mgr.get_recovery_log(db_path=db_file)
    assert len(log) >= 1
    restored_entry = next(e for e in log if e.id == action_item.id)
    assert restored_entry.is_restored is True
    assert "RESTORED" in restored_entry.status
