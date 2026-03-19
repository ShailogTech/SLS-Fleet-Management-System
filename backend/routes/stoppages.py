from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models.stoppage import Stoppage, StoppageCreate, StoppageUpdate
from utils.permissions import get_current_user
from utils.time_helpers import now_ist
from typing import List, Optional
from datetime import datetime, date
import os

router = APIRouter(prefix="/stoppages", tags=["Stoppages"])

def get_db():
    from server import db
    return db

@router.get("", response_model=List[dict])
async def get_stoppages(
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if status:
        query["status"] = status
    
    stoppages = await db.stoppages.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for stoppage in stoppages:
        vehicle = await db.vehicles.find_one({"id": stoppage["vehicle_id"]}, {"_id": 0})
        result.append({
            **stoppage,
            "vehicle_info": vehicle
        })
    
    return result

@router.post("", response_model=Stoppage)
async def create_stoppage(stoppage_data: StoppageCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_role = current_user.get("role")
    if user_role not in ["plant_incharge", "office_incharge", "admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    vehicle = await db.vehicles.find_one({"id": stoppage_data.vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    stoppage = Stoppage(**stoppage_data.model_dump())
    stoppage.created_by = current_user["sub"]
    
    stoppage_doc = stoppage.model_dump()
    stoppage_doc["created_at"] = stoppage_doc["created_at"].isoformat()
    stoppage_doc["updated_at"] = stoppage_doc["updated_at"].isoformat()
    stoppage_doc["stoppage_date"] = stoppage_doc["stoppage_date"].isoformat()
    if stoppage_doc.get("expected_resume_date"):
        stoppage_doc["expected_resume_date"] = stoppage_doc["expected_resume_date"].isoformat()
    
    await db.stoppages.insert_one(stoppage_doc)
    
    await db.vehicles.update_one(
        {"id": stoppage_data.vehicle_id},
        {"$set": {"vehicle_status": "stopped", "updated_at": now_ist()}}
    )
    
    return stoppage

@router.put("/{stoppage_id}", response_model=Stoppage)
async def update_stoppage(stoppage_id: str, update_data: StoppageUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_role = current_user.get("role")
    if user_role not in ["plant_incharge", "office_incharge", "admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.stoppages.find_one({"id": stoppage_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Stoppage not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = now_ist()
    
    if update_data.actual_resume_date:
        update_dict["actual_resume_date"] = update_data.actual_resume_date.isoformat()
        
        stoppage_date = datetime.fromisoformat(existing["stoppage_date"]).date()
        days_stopped = (update_data.actual_resume_date - stoppage_date).days
        update_dict["days_stopped"] = days_stopped
    
    if update_data.status == "resumed":
        await db.vehicles.update_one(
            {"id": existing["vehicle_id"]},
            {"$set": {"vehicle_status": "active", "updated_at": now_ist()}}
        )
    
    await db.stoppages.update_one({"id": stoppage_id}, {"$set": update_dict})
    
    updated_stoppage = await db.stoppages.find_one({"id": stoppage_id}, {"_id": 0})
    return updated_stoppage

@router.get("/analytics/summary")
async def get_stoppage_analytics(current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    total_stoppages = await db.stoppages.count_documents({})
    active_stoppages = await db.stoppages.count_documents({"status": "stopped"})
    resumed = await db.stoppages.count_documents({"status": "resumed"})
    
    pipeline = [
        {"$group": {
            "_id": "$reason",
            "count": {"$sum": 1}
        }}
    ]
    
    by_reason = await db.stoppages.aggregate(pipeline).to_list(1000)
    
    return {
        "total_stoppages": total_stoppages,
        "active_stoppages": active_stoppages,
        "resumed": resumed,
        "by_reason": by_reason
    }
