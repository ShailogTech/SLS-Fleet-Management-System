from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
from collections import defaultdict
import time
import uuid
from models.user import UserCreate, UserLogin, User, UserResponse
from utils.jwt import create_access_token, get_password_hash, verify_password
from utils.permissions import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_db():
    from server import db
    return db

# Simple in-memory rate limiter
_rate_limit_store = defaultdict(list)
_RATE_LIMIT_MAX = 5       # max attempts
_RATE_LIMIT_WINDOW = 60   # per 60 seconds

def _check_rate_limit(client_ip: str):
    now = time.time()
    # Clean old entries
    _rate_limit_store[client_ip] = [t for t in _rate_limit_store[client_ip] if now - t < _RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[client_ip]) >= _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    _rate_limit_store[client_ip].append(now)

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

@router.post("/signup-request")
async def signup_request(data: SignupRequest, request: Request):
    _check_rate_limit(request.client.host)
    """Submit a signup request that goes to admin/approver for role assignment"""
    if len(data.password) < 6 or len(data.password) > 20:
        raise HTTPException(status_code=400, detail="Password must be between 6 and 20 characters")
    
    db = get_db()
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if there's already a pending request
    existing_request = await db.signup_requests.find_one({"email": data.email}, {"_id": 0})
    if existing_request:
        raise HTTPException(status_code=400, detail="A registration request for this email is already pending")
    
    # Create signup request
    request_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "password_hash": get_password_hash(data.password),
        "status": "pending",  # pending, approved, rejected
        "assigned_role": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": None,
        "reviewed_at": None
    }
    
    await db.signup_requests.insert_one(request_doc)
    
    return {"message": "Registration request submitted successfully", "request_id": request_doc["id"]}

@router.get("/signup-requests")
async def get_signup_requests(current_user: dict = Depends(get_current_user)):
    """Get all pending signup requests (admin/approver only)"""
    db = get_db()
    
    if current_user["role"] not in ["admin", "superuser", "approver"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    requests = await db.signup_requests.find(
        {"status": "pending"}, 
        {"_id": 0}
    ).to_list(100)
    
    return requests

@router.post("/signup-requests/{request_id}/approve")
async def approve_signup_request(request_id: str, role: str, plant: str = None, current_user: dict = Depends(get_current_user)):
    """Approve a signup request and assign a role"""
    db = get_db()
    
    if current_user["role"] not in ["admin", "superuser", "approver"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the signup request
    signup_req = await db.signup_requests.find_one({"id": request_id}, {"_id": 0})
    if not signup_req:
        raise HTTPException(status_code=404, detail="Signup request not found")
    
    if signup_req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")
    
    valid_roles = ["driver", "maker", "checker", "operational_manager", "accounts_manager", "approver", "admin", "office_incharge", "plant_incharge", "records_incharge", "viewer"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Validate plant assignment for plant_incharge
    if role == "plant_incharge" and not plant:
        raise HTTPException(status_code=400, detail="Plant must be assigned for plant_incharge role")

    # Create the user
    user_doc = {
        "id": str(uuid.uuid4()),
        "name": signup_req["name"],
        "email": signup_req["email"],
        "phone": signup_req["phone"],
        "role": role,
        "status": "active",
        "password_hash": signup_req["password_hash"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if role == "plant_incharge" and plant:
        user_doc["plant"] = plant
    
    await db.users.insert_one(user_doc)
    
    # Update the signup request
    await db.signup_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "assigned_role": role,
            "reviewed_by": current_user["sub"],
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "User approved and created successfully", "user_id": user_doc["id"]}

@router.post("/signup-requests/{request_id}/reject")
async def reject_signup_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Reject a signup request"""
    db = get_db()
    
    if current_user["role"] not in ["admin", "superuser", "approver"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the signup request
    signup_req = await db.signup_requests.find_one({"id": request_id}, {"_id": 0})
    if not signup_req:
        raise HTTPException(status_code=404, detail="Signup request not found")
    
    if signup_req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")
    
    # Update the signup request
    await db.signup_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "reviewed_by": current_user["sub"],
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Signup request rejected"}

@router.post("/register")
async def register(user_data: UserCreate):
    db = get_db()
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    
    user = User(**user_dict)
    user_doc = user.model_dump()
    user_doc["password_hash"] = get_password_hash(password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    
    await db.users.insert_one(user_doc)
    
    return {"message": "User registered successfully", "user_id": user.id}

@router.post("/login")
async def login(credentials: UserLogin, request: Request):
    import logging
    logger = logging.getLogger(__name__)
    _check_rate_limit(request.client.host)
    try:
        db = get_db()
        user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if user.get("status") != "active":
            raise HTTPException(status_code=403, detail="Account is inactive. Please wait for admin approval.")

        access_token = create_access_token(
            data={"sub": user["id"], "email": user["email"], "role": user["role"]}
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "photo_url": user.get("photo_url")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
