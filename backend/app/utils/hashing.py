import hashlib
from pathlib import Path
from typing import List
from app.core.config import settings

def hash_file_sha256(filepath: Path, chunk_size: int = settings.HASH_CHUNK_SIZE) -> str:
    """Compute SHA-256 hash using chunked reads for memory efficiency O(C)."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest().upper()

def get_hex_sample(filepath: Path, lines: int = 4, bytes_per_line: int = 16) -> List[str]:
    """Generate forensic hex dump sample for frontend display."""
    result = []
    try:
        with open(filepath, "rb") as f:
            total_bytes = lines * bytes_per_line
            data = f.read(total_bytes)
            
            for i in range(0, len(data), bytes_per_line):
                chunk = data[i:i + bytes_per_line]
                hex_part = "  ".join(
                    " ".join(f"{b:02X}" for b in chunk[j:j+4])
                    for j in range(0, len(chunk), 4)
                )
                # Pad hex string if chunk is shorter than bytes_per_line
                expected_len = 48  # 16 bytes formatted with spaces
                hex_part = hex_part.ljust(expected_len)
                ascii_part = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
                offset = f"{i:08X}:"
                result.append(f"{offset}  {hex_part}  {ascii_part}")
    except Exception:
        result = [
            "00000000:  00 00 00 00  00 00 00 00  00 00 00 00  00 00 00 00  ................"
        ]
    return result

def hamming_distance(hash1: str, hash2: str) -> int:
    """Calculate Hamming distance between two hex string hashes."""
    if not hash1 or not hash2:
        return 64
    # Strip prefix if present (e.g. 0x)
    h1 = hash1.lower().replace("0x", "")
    h2 = hash2.lower().replace("0x", "")
    
    try:
        val1 = int(h1, 16)
        val2 = int(h2, 16)
        xor_val = val1 ^ val2
        return bin(xor_val).count("1")
    except ValueError:
        # String fallback
        return sum(c1 != c2 for c1, c2 in zip(h1, h2)) + abs(len(h1) - len(h2))
