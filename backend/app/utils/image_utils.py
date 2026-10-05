from pathlib import Path
from typing import Optional, Tuple
from PIL import Image
import imagehash
from app.core.config import settings

def is_supported_image(filepath: Path) -> bool:
    """Check if file extension is a supported image format."""
    return filepath.suffix.lower() in settings.SUPPORTED_IMAGE_EXTENSIONS

def get_image_resolution(filepath: Path) -> Optional[Tuple[int, int]]:
    """Read image dimensions (width, height) without decoding all pixel data."""
    try:
        with Image.open(filepath) as img:
            return img.size  # (width, height)
    except Exception:
        return None

def compute_perceptual_hash(filepath: Path) -> Optional[str]:
    """Compute 64-bit DCT perceptual hash (pHash) using Pillow & imagehash."""
    try:
        with Image.open(filepath) as img:
            h = imagehash.phash(img)
            return f"0x{str(h).upper()}"
    except Exception:
        return None
