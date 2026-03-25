from fastapi import APIRouter, HTTPException, Depends
from models.personal_vehicle import PersonalVehicle, PersonalVehicleCreate
from utils.permissions import get_current_user
from datetime import datetime

def get_db():
    from server import db
    return db

router = APIRouter(prefix="/personal-vehicles", tags=["Personal Vehicles"])


def require_authorized(current_user: dict):
    if current_user.get("role") not in ["superuser", "admin", "maker", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.get("")
async def get_personal_vehicles(current_user: dict = Depends(get_current_user)):
    require_authorized(current_user)
    vehicles = await get_db().personal_vehicles.find({}, {"_id": 0}).to_list(1000)
    return vehicles


@router.post("")
async def create_personal_vehicle(data: PersonalVehicleCreate, current_user: dict = Depends(get_current_user)):
    require_authorized(current_user)

    existing = await get_db().personal_vehicles.find_one({"vehicle_no": data.vehicle_no}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle with this number already exists")

    vehicle = PersonalVehicle(**data.model_dump())
    vehicle.created_by = current_user.get("sub")
    doc = vehicle.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    for key in ["insurance_expiry", "rc_expiry"]:
        if doc.get(key):
            doc[key] = doc[key].isoformat()
    await get_db().personal_vehicles.insert_one(doc)
    return {"message": "Personal vehicle added successfully", "id": vehicle.id}


@router.delete("/{vehicle_id}")
async def delete_personal_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    require_authorized(current_user)
    result = await get_db().personal_vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Personal vehicle deleted"}
