from fastapi import APIRouter, HTTPException, Depends, Query
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from models.driver import Driver, DriverCreate
from utils.permissions import get_current_user
from typing import List, Optional
import os
from datetime import datetime

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("", response_model=List[Driver])
async def get_drivers(
    status: Optional[str] = Query(None),
    plant: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if plant:
        query["plant"] = plant
    
    user_role = current_user.get("role")
    if user_role == "driver":
        user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
        if user_info and user_info.get("emp_id"):
            query["emp_id"] = user_info["emp_id"]
    
    drivers = await db.drivers.find(query, {"_id": 0}).to_list(1000)
    return drivers
    return drivers

@router.get("/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    driver = await get_db().drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.post("", response_model=Driver)
async def create_driver(driver_data: DriverCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().drivers.find_one({"emp_id": driver_data.emp_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    driver = Driver(**driver_data.model_dump())
    driver.submitted_by = current_user["sub"]
    driver.status = "pending"
    
    driver_doc = driver.model_dump()
    driver_doc["created_at"] = driver_doc["created_at"].isoformat()
    driver_doc["updated_at"] = driver_doc["updated_at"].isoformat()
    if driver_doc.get("dl_expiry"):
        driver_doc["dl_expiry"] = driver_doc["dl_expiry"].isoformat()
    if driver_doc.get("hazardous_cert_expiry"):
        driver_doc["hazardous_cert_expiry"] = driver_doc["hazardous_cert_expiry"].isoformat()
    
    await get_db().drivers.insert_one(driver_doc)
    
    from models.approval import Approval
    approval = Approval(entity_type="driver", entity_id=driver.id, submitted_by=current_user["sub"])
    approval_doc = approval.model_dump()
    approval_doc["created_at"] = approval_doc["created_at"].isoformat()
    approval_doc["updated_at"] = approval_doc["updated_at"].isoformat()
    await get_db().approvals.insert_one(approval_doc)
    
    return driver

@router.put("/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, driver_data: DriverCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().drivers.find_one({"id": driver_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    update_data = driver_data.model_dump()
    update_data["updated_at"] = datetime.now().isoformat()
    if update_data.get("dl_expiry"):
        update_data["dl_expiry"] = update_data["dl_expiry"].isoformat()
    if update_data.get("hazardous_cert_expiry"):
        update_data["hazardous_cert_expiry"] = update_data["hazardous_cert_expiry"].isoformat()
    
    await get_db().drivers.update_one({"id": driver_id}, {"$set": update_data})
    
    updated_driver = await get_db().drivers.find_one({"id": driver_id}, {"_id": 0})
    return updated_driver

@router.delete("/{driver_id}")
async def delete_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await get_db().drivers.delete_one({"id": driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": "Driver deleted successfully"}
