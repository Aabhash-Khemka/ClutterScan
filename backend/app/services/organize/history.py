"""
History retrieval for Smart Organize operations.
"""
from typing import Any, Dict, List, Optional
from app.database.database import get_db


def get_organize_history(db_path=None) -> List[Dict[str, Any]]:
    kwargs = {"db_path": db_path} if db_path else {}
    with get_db(**kwargs) as conn:
        ops = conn.execute(
            "SELECT * FROM organize_operations ORDER BY created_at DESC"
        ).fetchall()
        result = []
        for op in ops:
            files = conn.execute(
                "SELECT * FROM organize_files WHERE operation_id=?", (op["id"],)
            ).fetchall()
            result.append({
                "operationId": op["id"],
                "createdAt": op["created_at"],
                "sourceFolder": op["source_folder"],
                "status": op["status"],
                "totalPlanned": op["total_planned"],
                "totalMoved": op["total_moved"],
                "totalSkipped": op["total_skipped"],
                "totalFailed": op["total_failed"],
                "undoStatus": op["undo_status"],
                "files": [
                    {
                        "id": f["id"],
                        "filename": f["filename"],
                        "sourcePath": f["source_path"],
                        "destPath": f["dest_path"],
                        "category": f["category"],
                        "ruleReason": f["rule_reason"],
                        "sizeBytes": f["size_bytes"],
                        "status": f["status"],
                        "error": f["error"] or "",
                    }
                    for f in files
                ],
            })
        return result
