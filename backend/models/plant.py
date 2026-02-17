from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class PlantBase(BaseModel):
    plant_name: str
    plant_type: str
    city: str
    state: str
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None

class PlantCreate(PlantBase):
    plant_incharge_id: Optional[str] = None

class Plant(PlantBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plant_incharge_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
