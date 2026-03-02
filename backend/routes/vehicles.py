from fastapi import APIRouter, HTTPException, Depends, Query
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from models.vehicle import Vehicle, VehicleCreate
from utils.permissions import get_current_user
from typing import List, Optional
import os
from datetime import datetime

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("")
async def get_vehicles(
    status: Optional[str] = Query(None),
    plant: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if plant:
        query["plant"] = plant
    
    user_role = current_user.get("role")
    if user_role == "plant_incharge":
        user_info = await get_db().users.find_one({"id": current_user["sub"]}, {"_id": 0})
        if user_info and user_info.get("plant"):
            query["plant"] = user_info["plant"]
    
    vehicles = await get_db().vehicles.find(query, {"_id": 0}).to_list(1000)
    return vehicles

async def _find_vehicle(identifier: str):
    """Find a vehicle by engine_no first, then fall back to id (UUID)."""
    vehicle = await get_db().vehicles.find_one({"engine_no": identifier}, {"_id": 0})
    if not vehicle:
        vehicle = await get_db().vehicles.find_one({"id": identifier}, {"_id": 0})
    return vehicle

@router.get("/{identifier}")
async def get_vehicle(identifier: str, current_user: dict = Depends(get_current_user)):
    vehicle = await _find_vehicle(identifier)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@router.post("")
async def create_vehicle(vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().vehicles.find_one({"vehicle_no": vehicle_data.vehicle_no}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle number already exists")

    existing_engine = await get_db().vehicles.find_one({"engine_no": vehicle_data.engine_no}, {"_id": 0})
    if existing_engine:
        raise HTTPException(status_code=400, detail="Engine number already exists. Each vehicle must have a unique engine number.")

    vehicle = Vehicle(**vehicle_data.model_dump())
    vehicle.submitted_by = current_user["sub"]
    vehicle.status = "pending"
    
    vehicle_doc = vehicle.model_dump()
    vehicle_doc["created_at"] = vehicle_doc["created_at"].isoformat()
    vehicle_doc["updated_at"] = vehicle_doc["updated_at"].isoformat()
    if vehicle_doc.get("reg_date"):
        vehicle_doc["reg_date"] = vehicle_doc["reg_date"].isoformat()
    if vehicle_doc.get("documents"):
        for key, value in vehicle_doc["documents"].items():
            if value:
                vehicle_doc["documents"][key] = value.isoformat() if hasattr(value, 'isoformat') else value
    
    await get_db().vehicles.insert_one(vehicle_doc)
    
    from models.approval import Approval
    approval = Approval(entity_type="vehicle", entity_id=vehicle.id, submitted_by=current_user["sub"])
    approval_doc = approval.model_dump()
    approval_doc["created_at"] = approval_doc["created_at"].isoformat()
    approval_doc["updated_at"] = approval_doc["updated_at"].isoformat()
    await get_db().approvals.insert_one(approval_doc)
    
    return vehicle

@router.put("/{identifier}")
async def update_vehicle(identifier: str, vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    existing = await _find_vehicle(identifier)
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    vehicle_id = existing["id"]

    if vehicle_data.engine_no and vehicle_data.engine_no != existing.get("engine_no"):
        dup_engine = await get_db().vehicles.find_one({"engine_no": vehicle_data.engine_no, "id": {"$ne": vehicle_id}}, {"_id": 0})
        if dup_engine:
            raise HTTPException(status_code=400, detail="Engine number already exists. Each vehicle must have a unique engine number.")

    update_data = vehicle_data.model_dump()
    update_data["updated_at"] = datetime.now().isoformat()
    if update_data.get("reg_date"):
        update_data["reg_date"] = update_data["reg_date"].isoformat()
    if update_data.get("documents"):
        for key, value in update_data["documents"].items():
            if value:
                update_data["documents"][key] = value.isoformat() if hasattr(value, 'isoformat') else value

    await get_db().vehicles.update_one({"id": vehicle_id}, {"$set": update_data})

    updated_vehicle = await get_db().vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return updated_vehicle

@router.delete("/{identifier}")
async def delete_vehicle(identifier: str, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    existing = await _find_vehicle(identifier)
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    await get_db().vehicles.delete_one({"id": existing["id"]})
    return {"message": "Vehicle deleted successfully"}
