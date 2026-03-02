from fastapi import APIRouter, HTTPException, Depends
from utils.permissions import get_current_user

router = APIRouter(prefix="/plant-portal", tags=["Plant Incharge Portal"])


def get_db():
    from server import db
    return db


@router.get("/my-plant")
async def get_my_plant(current_user: dict = Depends(get_current_user)):
    db = get_db()

    user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user_info or user_info.get("role") != "plant_incharge":
        raise HTTPException(status_code=403, detail="Only plant incharges can access this endpoint")

    plant_name = user_info.get("plant")
    if not plant_name:
        return {"plant": None, "plant_name": None, "user": user_info, "vehicle_count": 0, "driver_count": 0}

    plant_info = await db.plants.find_one({"plant_name": plant_name}, {"_id": 0})

    vehicle_count = await db.vehicles.count_documents({"plant": plant_name})
    driver_count = await db.drivers.count_documents({"plant": plant_name})

    return {
        "plant": plant_info,
        "plant_name": plant_name,
        "user": {k: v for k, v in user_info.items() if k != "password_hash"},
        "vehicle_count": vehicle_count,
        "driver_count": driver_count,
    }


@router.get("/vehicles")
async def get_plant_vehicles(current_user: dict = Depends(get_current_user)):
    db = get_db()

    user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user_info or user_info.get("role") != "plant_incharge":
        raise HTTPException(status_code=403, detail="Only plant incharges can access this endpoint")

    plant_name = user_info.get("plant")
    if not plant_name:
        return []

    vehicles = await db.vehicles.find({"plant": plant_name}, {"_id": 0}).to_list(1000)
    return vehicles


@router.get("/drivers")
async def get_plant_drivers(current_user: dict = Depends(get_current_user)):
    db = get_db()

    user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user_info or user_info.get("role") != "plant_incharge":
        raise HTTPException(status_code=403, detail="Only plant incharges can access this endpoint")

    plant_name = user_info.get("plant")
    if not plant_name:
        return []

    drivers = await db.drivers.find({"plant": plant_name}, {"_id": 0}).to_list(1000)
    return drivers
