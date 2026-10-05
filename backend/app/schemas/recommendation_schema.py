from pydantic import BaseModel
from typing import List

class CleanupCandidateResponse(BaseModel):
    id: str
    rank: str
    impactScore: int
    targetPath: str
    reasons: List[str]
    recoverableFormatted: str
    bytes: int
    isSelected: bool
