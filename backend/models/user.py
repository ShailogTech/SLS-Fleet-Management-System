from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: str
    role: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    password: str
    role: str = "viewer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now())

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: str
    status: str
    created_at: datetime
