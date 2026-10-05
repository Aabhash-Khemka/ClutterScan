import os
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "ClutterScan"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DATABASE_PATH: Path = DATA_DIR / "clutterscan.db"
    RECOVERY_VAULT_DIR: Path = DATA_DIR / "recovery_vault"
    
    # Algorithm 3: Chunked Hashing
    HASH_CHUNK_SIZE: int = 64 * 1024  # 64 KB chunks
    
    # Algorithm 5: Similar Image Detection (Hamming Distance Threshold)
    DEFAULT_SIMILARITY_THRESHOLD: int = 8
    SUPPORTED_IMAGE_EXTENSIONS: set[str] = {
        ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif", ".dng"
    }
    
    # Algorithm 6: Old & Temporary File Detection
    DEFAULT_OLD_FILE_DAYS: int = 180
    TEMP_EXTENSIONS: set[str] = {
        ".tmp", ".temp", ".cache", ".bak", ".old", ".dmp", 
        ".log", ".crdownload", ".part", ".chk", ".swp", ".swo"
    }
    TEMP_DIRECTORIES: set[str] = {
        "temp", "tmp", "cache", ".cache", "crashdumps", "inetcache", "caches"
    }
    
    # Algorithm 9: Recommendation Scoring Weights
    W_DUP: float = 35.0
    W_RES: float = 20.0
    W_TEMP: float = 20.0
    W_AGE: float = 15.0
    W_SIZE: float = 10.0
    W_RECENT: float = 15.0

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.RECOVERY_VAULT_DIR.mkdir(parents=True, exist_ok=True)
