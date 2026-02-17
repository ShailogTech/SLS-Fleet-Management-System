from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime, date
import uuid

class DriverBase(BaseModel):
    name: str
    emp_id: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    dl_no: str
    dl_expiry: Optional[date] = None
    hazardous_cert_expiry: Optional[date] = None
    plant: Optional[str] = None
    allocated_vehicle: Optional[str] = None

class DriverCreate(DriverBase):
    pass

class Driver(DriverBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    submitted_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
