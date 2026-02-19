from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from utils.permissions import get_current_user
from typing import List
import os

router = APIRouter(prefix="/driver", tags=["Driver Portal"])

def get_db():
    from server import db
    return db

@router.get("/my-vehicle")
async def get_my_vehicle(current_user: dict = Depends(get_current_user)):
    db = get_db()

    user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user_info or user_info.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can access this endpoint")

    # Primary lookup by emp_id
    driver_info = await db.drivers.find_one({"emp_id": user_info.get("emp_id")}, {"_id": 0}) if user_info.get("emp_id") else None

    # Fallback 1: match by phone
    if not driver_info and user_info.get("phone"):
        driver_info = await db.drivers.find_one({"phone": user_info["phone"]}, {"_id": 0})

    # Fallback 2: match by name
    if not driver_info and user_info.get("name"):
        driver_info = await db.drivers.find_one({"name": user_info["name"]}, {"_id": 0})

    # Sync emp_id back to user record for future lookups
    if driver_info and driver_info.get("emp_id") and driver_info["emp_id"] != user_info.get("emp_id"):
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {"emp_id": driver_info["emp_id"]}}
        )

    if not driver_info:
        return {
            "driver": {
                "name": user_info.get("name"),
                "emp_id": user_info.get("emp_id", "N/A"),
                "phone": user_info.get("phone"),
                "dl_no": None,
                "dl_expiry": None,
                "hazardous_cert_expiry": None,
            },
            "vehicle": None,
            "documents": []
        }

    allocated_vehicle_no = driver_info.get("allocated_vehicle")
    if not allocated_vehicle_no:
        return {"message": "No vehicle allocated", "vehicle": None, "driver": driver_info}

    vehicle = await db.vehicles.find_one({"vehicle_no": allocated_vehicle_no}, {"_id": 0})

    documents = []
    if vehicle:
        documents = await db.documents.find(
            {"entity_type": "vehicle", "entity_id": vehicle.get("id")},
            {"_id": 0}
        ).to_list(100)

    return {
        "driver": driver_info,
        "vehicle": vehicle,
        "documents": documents
    }

@router.get("/profile")
async def get_driver_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()

    user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user_info or user_info.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can access this endpoint")

    # Primary lookup by emp_id
    driver_info = await db.drivers.find_one({"emp_id": user_info.get("emp_id")}, {"_id": 0}) if user_info.get("emp_id") else None

    # Fallback 1: match by phone
    if not driver_info and user_info.get("phone"):
        driver_info = await db.drivers.find_one({"phone": user_info["phone"]}, {"_id": 0})

    # Fallback 2: match by name
    if not driver_info and user_info.get("name"):
        driver_info = await db.drivers.find_one({"name": user_info["name"]}, {"_id": 0})

    # Sync emp_id back to user record for future lookups
    if driver_info and driver_info.get("emp_id") and driver_info["emp_id"] != user_info.get("emp_id"):
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {"emp_id": driver_info["emp_id"]}}
        )
        user_info["emp_id"] = driver_info["emp_id"]

    return {
        "user": user_info,
        "driver": driver_info
    }
