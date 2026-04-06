from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models.plant import Plant, PlantCreate
from utils.permissions import get_current_user
from utils.time_helpers import now_ist
from typing import List
import os
from datetime import datetime

router = APIRouter(prefix="/plants", tags=["Plants"])

def get_db():
    from server import db
    return db

@router.get("")
async def get_plants(current_user: dict = Depends(get_current_user)):
    db = get_db()
    plants = await db.plants.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return plants

@router.get("/{plant_id}")
async def get_plant(plant_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    plant = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant

@router.post("", response_model=Plant)
async def create_plant(plant_data: PlantCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_role = current_user.get("role")
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.plants.find_one({"plant_name": plant_data.plant_name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Plant name already exists")
    
    plant = Plant(**plant_data.model_dump())
    plant_doc = plant.model_dump()
    plant_doc["created_at"] = plant_doc["created_at"].isoformat()
    plant_doc["updated_at"] = plant_doc["updated_at"].isoformat()

    await db.plants.insert_one(plant_doc)

    # Assign plant to the incharge user (set user.plant only if not already set)
    if plant_data.plant_incharge_id:
        incharge_user = await db.users.find_one({"id": plant_data.plant_incharge_id}, {"_id": 0, "plant": 1})
        if incharge_user and not incharge_user.get("plant"):
            await db.users.update_one(
                {"id": plant_data.plant_incharge_id},
                {"$set": {"plant": plant_data.plant_name}}
            )

    return plant

@router.put("/{plant_id}", response_model=Plant)
async def update_plant(plant_id: str, plant_data: PlantCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_role = current_user.get("role")
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    update_data = plant_data.model_dump()
    update_data["updated_at"] = now_ist()

    await db.plants.update_one({"id": plant_id}, {"$set": update_data})

    # Sync: if plant_incharge_id changed, update the new incharge user's plant field
    old_incharge_id = existing.get("plant_incharge_id")
    new_incharge_id = plant_data.plant_incharge_id
    plant_name = plant_data.plant_name or existing.get("plant_name")

    if new_incharge_id and new_incharge_id != old_incharge_id:
        # Set new incharge user's plant if not already set
        incharge_user = await db.users.find_one({"id": new_incharge_id}, {"_id": 0, "plant": 1})
        if incharge_user and not incharge_user.get("plant"):
            await db.users.update_one(
                {"id": new_incharge_id},
                {"$set": {"plant": plant_name}}
            )

    updated_plant = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    return updated_plant

@router.delete("/{plant_id}")
async def delete_plant(plant_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_role = current_user.get("role")
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    existing = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Plant not found")

    await db.plants.delete_one({"id": plant_id})
    return {"message": "Plant deleted successfully"}

@router.post("/{plant_id}/assign-vehicles")
async def assign_vehicles_to_plant(plant_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Assign one or more vehicles to a plant by setting their plant field."""
    db = get_db()
    user_role = current_user.get("role")
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    plant = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    vehicle_ids = body.get("vehicle_ids", [])
    if not vehicle_ids:
        raise HTTPException(status_code=400, detail="No vehicles provided")

    plant_name = plant["plant_name"]
    result = await db.vehicles.update_many(
        {"id": {"$in": vehicle_ids}},
        {"$set": {"plant": plant_name, "updated_at": now_ist()}}
    )

    # Also sync drivers assigned to these vehicles
    vehicles = await db.vehicles.find({"id": {"$in": vehicle_ids}}, {"_id": 0, "assigned_driver_id": 1}).to_list(1000)
    driver_ids = [v["assigned_driver_id"] for v in vehicles if v.get("assigned_driver_id")]
    if driver_ids:
        await db.drivers.update_many(
            {"id": {"$in": driver_ids}},
            {"$set": {"plant": plant_name, "updated_at": now_ist()}}
        )

    return {"message": f"{result.modified_count} vehicle(s) assigned to {plant_name}"}


@router.get("/stats/vehicles")
async def get_plant_vehicle_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    pipeline = [
        {"$group": {
            "_id": "$plant",
            "total_vehicles": {"$sum": 1},
            "active_vehicles": {
                "$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}
            }
        }}
    ]
    
    stats = await db.vehicles.aggregate(pipeline).to_list(1000)
    return stats
