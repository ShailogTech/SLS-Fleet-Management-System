from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class ApprovalBase(BaseModel):
    entity_type: str
    entity_id: str
    submitted_by: str

class ApprovalCreate(ApprovalBase):
    pass

class ApprovalAction(BaseModel):
    action: str
    comment: Optional[str] = None

class Approval(ApprovalBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    checker_id: Optional[str] = None
    checker_comment: Optional[str] = None
    checker_action_at: Optional[datetime] = None
    approver_id: Optional[str] = None
    approver_comment: Optional[str] = None
    approver_action_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
