from fastapi import APIRouter, HTTPException, Depends
from utils.permissions import get_current_user
from utils.plant_helpers import get_incharge_plant_names

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

    plant_names = await get_incharge_plant_names(db, current_user["sub"], user_info.get("plant"))

    if not plant_names:
        return {"plant": None, "plant_name": None, "plant_names": [], "user": user_info, "vehicle_count": 0, "driver_count": 0}

    # Get all plant records
    plant_infos = await db.plants.find({"plant_name": {"$in": plant_names}}, {"_id": 0}).to_list(100)

    vehicle_count = await db.vehicles.count_documents({"plant": {"$in": plant_names}})
    driver_count = await db.drivers.count_documents({"plant": {"$in": plant_names}})

    return {
        "plant": plant_infos[0] if plant_infos else None,
        "plants": plant_infos,
        "plant_name": plant_names[0] if plant_names else None,
        "plant_names": plant_names,
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

    plant_names = await get_incharge_plant_names(db, current_user["sub"], user_info.get("plant"))
    if not plant_names:
        return []

    vehicles = await db.vehicles.find({"plant": {"$in": plant_names}}, {"_id": 0}).to_list(1000)
    return vehicles


@router.get("/drivers")
async def get_plant_drivers(current_user: dict = Depends(get_current_user)):
    db = get_db()

    user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user_info or user_info.get("role") != "plant_incharge":
        raise HTTPException(status_code=403, detail="Only plant incharges can access this endpoint")

    plant_names = await get_incharge_plant_names(db, current_user["sub"], user_info.get("plant"))
    if not plant_names:
        return []

    drivers = await db.drivers.find({"plant": {"$in": plant_names}}, {"_id": 0}).to_list(1000)
    return drivers
