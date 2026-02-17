from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
import uuid

class TenderBase(BaseModel):
    tender_name: str
    tender_no: str
    client: str
    start_date: date
    end_date: date
    contract_validity: Optional[date] = None
    plant: Optional[str] = None
    contract_type: Optional[str] = None
    sd_number: Optional[str] = None
    sd_value: Optional[str] = None
    sd_bank: Optional[str] = None
    bg_number: Optional[str] = None
    bg_value: Optional[str] = None
    bg_bank: Optional[str] = None
    extension_granted: bool = False
    extension_end_date: Optional[date] = None

class TenderCreate(TenderBase):
    assigned_vehicles: Optional[List[str]] = []

class Tender(TenderBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    assigned_vehicles: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
