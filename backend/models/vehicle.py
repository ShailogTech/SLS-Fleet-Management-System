from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, date
import uuid

class VehicleDocuments(BaseModel):
    rc_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    tax_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None
    national_permit_expiry: Optional[date] = None

class VehicleBase(BaseModel):
    vehicle_no: str
    owner_name: str
    capacity: Optional[str] = None
    reg_date: Optional[date] = None
    make: str
    chassis_no: Optional[str] = None
    engine_no: str
    rto: Optional[str] = None
    plant: Optional[str] = None
    tender: Optional[str] = None
    tender_no: Optional[str] = None
    tender_name: Optional[str] = None
    manager: Optional[str] = None
    hypothecation: bool = False
    finance_company: Optional[str] = None
    phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    
class VehicleCreate(VehicleBase):
    documents: Optional[VehicleDocuments] = None

class Vehicle(VehicleBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    documents: Optional[VehicleDocuments] = None
    submitted_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
