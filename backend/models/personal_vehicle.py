from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
import uuid


class PersonalVehicleCreate(BaseModel):
    vehicle_no: str
    owner_name: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    year: Optional[int] = None
    insurance_expiry: Optional[date] = None
    rc_expiry: Optional[date] = None
    notes: Optional[str] = None


class PersonalVehicle(PersonalVehicleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
