import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator
from app.core.config import settings

DATABASE_PATH = settings.DATABASE_PATH
SCHEMA_PATH = Path(__file__).parent / "schema.sql"

def init_db(db_path: Path = DATABASE_PATH) -> None:
    """Initialize SQLite database using schema.sql."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_script = f.read()
        conn.executescript(schema_script)
        recommendation_columns = {
            row[1] for row in conn.execute("PRAGMA table_info(recommendations)")
        }
        if "score_breakdown" not in recommendation_columns:
            conn.execute(
                "ALTER TABLE recommendations ADD COLUMN score_breakdown TEXT NOT NULL DEFAULT '[]'"
            )
        if "selection_threshold" not in recommendation_columns:
            conn.execute(
                "ALTER TABLE recommendations ADD COLUMN selection_threshold INTEGER NOT NULL DEFAULT 60"
            )
        conn.commit()

@contextmanager
def get_db(db_path: Path = DATABASE_PATH) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite connections with row factory."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
