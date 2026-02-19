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


@router.get("")
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

    # Enrich with document expiry dates for drivers missing them
    driver_ids_needing_dates = [
        d["id"] for d in drivers
        if not d.get("dl_expiry") or not d.get("hazardous_cert_expiry")
    ]
    if driver_ids_needing_dates:
        docs = await db.documents.find(
            {"entity_type": "driver", "entity_id": {"$in": driver_ids_needing_dates},
             "document_type": {"$in": ["dl", "hazardous"]}},
            {"_id": 0, "entity_id": 1, "document_type": 1, "expiry_date": 1}
        ).to_list(5000)
        doc_map = {}
        for doc in docs:
            key = (doc["entity_id"], doc["document_type"])
            if doc.get("expiry_date"):
                doc_map[key] = doc["expiry_date"]
        for driver in drivers:
            if not driver.get("dl_expiry"):
                driver["dl_expiry"] = doc_map.get((driver["id"], "dl"))
            if not driver.get("hazardous_cert_expiry"):
                driver["hazardous_cert_expiry"] = doc_map.get((driver["id"], "hazardous"))

    return drivers

@router.get("/{driver_id}")
async def get_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Enrich with document expiry dates if missing from driver record
    if not driver.get("dl_expiry") or not driver.get("hazardous_cert_expiry"):
        docs = await db.documents.find(
            {"entity_type": "driver", "entity_id": driver_id},
            {"_id": 0, "document_type": 1, "expiry_date": 1}
        ).to_list(50)
        for doc in docs:
            if doc.get("document_type") == "dl" and doc.get("expiry_date") and not driver.get("dl_expiry"):
                driver["dl_expiry"] = doc["expiry_date"]
            if doc.get("document_type") == "hazardous" and doc.get("expiry_date") and not driver.get("hazardous_cert_expiry"):
                driver["hazardous_cert_expiry"] = doc["expiry_date"]

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
