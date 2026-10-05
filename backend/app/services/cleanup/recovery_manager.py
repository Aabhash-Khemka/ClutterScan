import shutil
import uuid
from pathlib import Path
from typing import Tuple, Optional
from app.core.config import settings

class RecoveryManager:
    """Manages reversible local quarantine/recovery vault storage for safe restoration."""

    def __init__(self, vault_dir: Path = settings.RECOVERY_VAULT_DIR):
        self.vault_dir = vault_dir
        self.vault_dir.mkdir(parents=True, exist_ok=True)

    def move_to_vault(self, file_path: Path) -> Tuple[bool, str, Optional[str]]:
        """
        Move file into the recovery vault.
        Returns (success: bool, message: str, vault_filepath: Optional[str]).
        """
        try:
            if not file_path.exists():
                return False, f"File '{file_path}' does not exist.", None

            unique_vault_name = f"{uuid.uuid4().hex}_{file_path.name}"
            vault_target = self.vault_dir / unique_vault_name

            shutil.move(str(file_path), str(vault_target))
            return True, "Moved to local recovery vault", str(vault_target)
        except Exception as e:
            return False, f"Vault storage failed: {str(e)}", None

    def restore_from_vault(
        self, vault_filepath: str, original_path: str, alternate_dir: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Restore a file from recovery vault back to its original path or an alternate path.
        """
        try:
            v_path = Path(vault_filepath)
            if not v_path.exists():
                return False, f"Vault file '{vault_filepath}' does not exist."

            dest_path = Path(original_path)
            if alternate_dir:
                dest_path = Path(alternate_dir) / dest_path.name

            # Ensure parent destination directory exists
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            # If destination already exists, resolve collision
            if dest_path.exists():
                stem = dest_path.stem
                suffix = dest_path.suffix
                dest_path = dest_path.parent / f"{stem}_restored{suffix}"

            shutil.move(str(v_path), str(dest_path))
            return True, f"Successfully restored to {dest_path}"
        except Exception as e:
            return False, f"Restore failed: {str(e)}"
