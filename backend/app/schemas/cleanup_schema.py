from pydantic import BaseModel
from typing import List, Optional

class CleanupCandidateItem(BaseModel):
    id: str
    targetPath: str
    bytes: Optional[int] = 0
    reasons: Optional[List[str]] = []

class CleanupConfirmRequest(BaseModel):
    candidates: List[CleanupCandidateItem]
    preferTrash: bool = True

class RecoveryLogResponse(BaseModel):
    id: str
    dispatchId: str
    filename: str
    sizeFormatted: str
    originPath: str
    status: str
    location: str
    timestamp: str
    isRestored: bool
