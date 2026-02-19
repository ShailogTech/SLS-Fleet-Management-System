from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
def get_db():
    from server import db
    return db

from models.user import UserCreate, User, UserResponse
from utils.jwt import get_password_hash
from utils.permissions import get_current_user
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import uuid

router = APIRouter(prefix="/users", tags=["Users"])

PHOTO_DIR = Path(__file__).parent.parent / "uploads" / "photos"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)


# ===== Profile Endpoints (MUST be before /{user_id} routes) =====

@router.get("/profile")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    pending_edit = await db.profile_edits.find_one(
        {"user_id": current_user["sub"], "status": "pending"},
        {"_id": 0}
    )
    
    return {"profile": user, "pending_edit": pending_edit}


@router.put("/profile")
async def update_my_profile(data: dict, current_user: dict = Depends(get_current_user)):
    """Submit a profile edit request that goes through approval."""
    db = get_db()
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.profile_edits.find_one(
        {"user_id": current_user["sub"], "status": "pending"}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending profile edit request")

    allowed = {"name", "phone", "emp_id", "address", "emergency_contact"}
    changes = {k: v for k, v in data.items() if k in allowed and v != user.get(k)}

    if not changes:
        raise HTTPException(status_code=400, detail="No changes detected")

    edit_id = str(uuid.uuid4())
    edit_doc = {
        "id": edit_id,
        "user_id": current_user["sub"],
        "user_name": user.get("name", ""),
        "user_role": user.get("role", ""),
        "current_data": {k: user.get(k) for k in changes},
        "requested_data": changes,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "reviewed_by": None,
        "reviewed_at": None,
        "reviewer_comment": None,
    }
    await db.profile_edits.insert_one(edit_doc)

    from models.approval import Approval
    approval = Approval(entity_type="profile_edit", entity_id=edit_id, submitted_by=current_user["sub"])
    approval_doc = approval.model_dump()
    approval_doc["created_at"] = approval_doc["created_at"].isoformat()
    approval_doc["updated_at"] = approval_doc["updated_at"].isoformat()
    await db.approvals.insert_one(approval_doc)

    return {"message": "Profile edit submitted for approval", "edit_id": edit_id}


@router.post("/profile/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    ext = Path(file.filename).suffix.lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp'}:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP allowed")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    filename = f"{current_user['sub']}{ext}"
    filepath = PHOTO_DIR / filename
    with open(filepath, "wb") as f:
        f.write(content)

    photo_url = f"/api/users/photo/{filename}"
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"photo_url": photo_url}}
    )

    return {"message": "Photo uploaded", "photo_url": photo_url}


@router.get("/photo/{filename}")
async def serve_photo(filename: str):
    filepath = PHOTO_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(str(filepath))


@router.get("/profile-edits")
async def get_profile_edits(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "superuser", "checker", "operational_manager", "approver"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    edits = await get_db().profile_edits.find(
        {"status": "pending"}, {"_id": 0}
    ).to_list(100)
    return edits


@router.post("/profile-edits/{edit_id}/approve")
async def approve_profile_edit(edit_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["checker", "operational_manager", "approver"]:
        raise HTTPException(status_code=403, detail="Only checkers/approvers can approve profile edits")
    
    db = get_db()
    edit = await db.profile_edits.find_one({"id": edit_id}, {"_id": 0})
    if not edit:
        raise HTTPException(status_code=404, detail="Edit request not found")
    if edit["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")

    await db.users.update_one({"id": edit["user_id"]}, {"$set": edit["requested_data"]})
    await db.profile_edits.update_one(
        {"id": edit_id},
        {"$set": {"status": "approved", "reviewed_by": current_user["sub"], "reviewed_at": datetime.now().isoformat()}}
    )
    await db.approvals.update_one(
        {"entity_type": "profile_edit", "entity_id": edit_id},
        {"$set": {"status": "approved", "updated_at": datetime.now().isoformat()}}
    )

    return {"message": "Profile edit approved and applied"}


@router.post("/profile-edits/{edit_id}/reject")
async def reject_profile_edit(edit_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["checker", "operational_manager", "approver"]:
        raise HTTPException(status_code=403, detail="Only checkers/approvers can reject profile edits")
    
    db = get_db()
    edit = await db.profile_edits.find_one({"id": edit_id}, {"_id": 0})
    if not edit:
        raise HTTPException(status_code=404, detail="Edit request not found")
    if edit["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already processed")

    await db.profile_edits.update_one(
        {"id": edit_id},
        {"$set": {"status": "rejected", "reviewed_by": current_user["sub"], "reviewed_at": datetime.now().isoformat()}}
    )
    await db.approvals.update_one(
        {"entity_type": "profile_edit", "entity_id": edit_id},
        {"$set": {"status": "rejected", "updated_at": datetime.now().isoformat()}}
    )

    return {"message": "Profile edit rejected"}


# ===== Admin User Management Endpoints =====

@router.get("", response_model=List[dict])
async def get_users(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    users = await get_db().users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@router.post("", response_model=dict)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    
    user = User(**user_dict)
    user_doc = user.model_dump()
    user_doc["password_hash"] = get_password_hash(password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    
    await get_db().users.insert_one(user_doc)
    
    user_response = {k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]}
    return user_response

@router.put("/{user_id}", response_model=dict)
async def update_user(user_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if "name" in user_data:
        update_data["name"] = user_data["name"]
    if "phone" in user_data:
        update_data["phone"] = user_data["phone"]
    if "role" in user_data:
        update_data["role"] = user_data["role"]
    if "status" in user_data:
        update_data["status"] = user_data["status"]
    
    await get_db().users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await get_db().users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated_user
