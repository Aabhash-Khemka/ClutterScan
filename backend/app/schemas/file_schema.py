from pydantic import BaseModel
from typing import Optional, List

class TreeNodeResponse(BaseModel):
    id: str
    name: str
    path: str
    size: str
    bytes: int
    isDir: bool
    isOpen: Optional[bool] = False
    tag: Optional[str] = None
    children: Optional[List["TreeNodeResponse"]] = None

TreeNodeResponse.model_rebuild()

class MetadataFileResponse(BaseModel):
    id: str
    path: str
    inodeAge: str
    type: str
    size: str
    bytes: int
    reason: str
    isStaged: bool = False
