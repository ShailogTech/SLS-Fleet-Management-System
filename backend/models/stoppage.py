from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, date
import uuid

class StoppageBase(BaseModel):
    vehicle_id: str
    stoppage_date: date
    reason: str
    expected_resume_date: Optional[date] = None
    remarks: Optional[str] = None

class StoppageCreate(StoppageBase):
    pass

class StoppageUpdate(BaseModel):
    actual_resume_date: Optional[date] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class Stoppage(StoppageBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actual_resume_date: Optional[date] = None
    days_stopped: Optional[int] = None
    status: str = "stopped"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
