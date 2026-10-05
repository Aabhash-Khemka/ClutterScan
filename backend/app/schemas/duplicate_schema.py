from pydantic import BaseModel
from typing import List

class DuplicateFileResponse(BaseModel):
    id: str
    name: str
    path: str
    resolution: str
    size: str
    bytes: int
    isPreferred: bool
    status: str
    statusDesc: str
    rationale: str

class AlgorithmicRuleResponse(BaseModel):
    reason: str
    safetyRule: str
    stagingAction: str

class HashGroupResponse(BaseModel):
    id: str
    sectorName: str
    hash: str
    shortHash: str
    matchCount: int
    sizeFormatted: str
    files: List[DuplicateFileResponse]
    algorithmicRule: AlgorithmicRuleResponse
    hexSample: List[str]
