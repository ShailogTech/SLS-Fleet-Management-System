from fastapi import APIRouter, HTTPException, Depends, Query
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from models.vehicle import Vehicle, VehicleCreate
from utils.permissions import get_current_user
from utils.time_helpers import now_ist
from typing import List, Optional
import os
from datetime import datetime
from utils.plant_helpers import get_incharge_plant_names

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("")
async def get_vehicles(
    status: Optional[str] = Query(None),
    plant: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    VALID_STATUSES = {"active", "inactive", "pending", "rejected"}
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query["status"] = status
    if plant:
        if not isinstance(plant, str) or len(plant) > 100:
            raise HTTPException(status_code=400, detail="Invalid plant filter")
        query["plant"] = plant

    user_role = current_user.get("role")
    if user_role == "plant_incharge":
        user_info = await get_db().users.find_one({"id": current_user["sub"]}, {"_id": 0})
        plant_names = await get_incharge_plant_names(get_db(), current_user["sub"], user_info.get("plant") if user_info else None)
        if plant_names:
            query["plant"] = {"$in": plant_names}

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
    # Admin/superuser bypass approval - directly active
    is_admin = user_role in ["admin", "superuser"]
    vehicle.status = "active" if is_admin else "pending"
    
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
    
    # Only create approval record for non-admin users
    if not is_admin:
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
    update_data["updated_at"] = now_ist()
    if update_data.get("reg_date"):
        update_data["reg_date"] = update_data["reg_date"].isoformat()
    if update_data.get("documents"):
        for key, value in update_data["documents"].items():
            if value:
                update_data["documents"][key] = value.isoformat() if hasattr(value, 'isoformat') else value

    await get_db().vehicles.update_one({"id": vehicle_id}, {"$set": update_data})

    # If plant changed and vehicle has an assigned driver, sync driver's plant
    new_plant = update_data.get("plant")
    old_plant = existing.get("plant")
    assigned_driver_id = existing.get("assigned_driver_id") or update_data.get("assigned_driver_id")
    if new_plant and new_plant != old_plant and assigned_driver_id:
        await get_db().drivers.update_one(
            {"id": assigned_driver_id},
            {"$set": {"plant": new_plant, "updated_at": now_ist()}}
        )

    updated_vehicle = await get_db().vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return updated_vehicle

@router.post("/{identifier}/assign-driver")
async def assign_driver_to_vehicle(identifier: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Assign a driver to a vehicle. Updates both vehicle and driver records."""
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db = get_db()
    vehicle = await _find_vehicle(identifier)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    driver_id = body.get("driver_id")

    # If driver_id is empty/null, unassign
    if not driver_id:
        # Clear old driver's allocated_vehicle if one was assigned
        old_driver_id = vehicle.get("assigned_driver_id")
        if old_driver_id:
            await db.drivers.update_one(
                {"id": old_driver_id},
                {"$set": {"allocated_vehicle": None, "updated_at": now_ist()}}
            )
        await db.vehicles.update_one(
            {"id": vehicle["id"]},
            {"$set": {"assigned_driver_id": None, "assigned_driver_name": None, "updated_at": now_ist()}}
        )
        return {"message": "Driver unassigned from vehicle"}

    # Find the driver
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Clear old driver's allocated_vehicle (if a different driver was previously assigned)
    old_driver_id = vehicle.get("assigned_driver_id")
    if old_driver_id and old_driver_id != driver_id:
        await db.drivers.update_one(
            {"id": old_driver_id},
            {"$set": {"allocated_vehicle": None, "updated_at": now_ist()}}
        )

    # Clear old vehicle's assigned_driver if this driver was assigned to a different vehicle
    old_vehicle_no = driver.get("allocated_vehicle")
    if old_vehicle_no and old_vehicle_no != vehicle.get("vehicle_no"):
        await db.vehicles.update_one(
            {"vehicle_no": old_vehicle_no},
            {"$set": {"assigned_driver_id": None, "assigned_driver_name": None, "updated_at": now_ist()}}
        )

    # Update vehicle with new driver
    await db.vehicles.update_one(
        {"id": vehicle["id"]},
        {"$set": {
            "assigned_driver_id": driver_id,
            "assigned_driver_name": driver.get("name"),
            "updated_at": now_ist()
        }}
    )

    # Update driver with new vehicle and sync plant
    driver_update = {
        "allocated_vehicle": vehicle.get("vehicle_no"),
        "updated_at": now_ist()
    }
    if vehicle.get("plant"):
        driver_update["plant"] = vehicle["plant"]
    await db.drivers.update_one({"id": driver_id}, {"$set": driver_update})

    return {"message": "Driver assigned to vehicle successfully", "driver_name": driver.get("name"), "vehicle_no": vehicle.get("vehicle_no")}

@router.post("/{identifier}/shift")
async def shift_vehicle(identifier: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Shift (renumber) a vehicle: save NOC/LOE flags and update vehicle_no. engine_no stays unchanged."""
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    vehicle = await _find_vehicle(identifier)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    new_vehicle_no = body.get("new_vehicle_no", "").strip()
    if not new_vehicle_no:
        raise HTTPException(status_code=400, detail="New vehicle number is required")

    # Check the new vehicle_no is not already taken by another vehicle
    dup = await get_db().vehicles.find_one({"vehicle_no": new_vehicle_no, "id": {"$ne": vehicle["id"]}}, {"_id": 0})
    if dup:
        raise HTTPException(status_code=400, detail="Vehicle number already exists")

    old_vehicle_no = vehicle.get("vehicle_no")
    old_tender_name = vehicle.get("tender_name")
    new_tender_name = body.get("tender")
    new_plant = body.get("plant")

    update_data = {
        "noc_applied": bool(body.get("noc_applied")),
        "noc_obtained": bool(body.get("noc_obtained")),
        "loe_obtained": bool(body.get("loe_obtained")),
        "vehicle_no": new_vehicle_no,
        "updated_at": now_ist(),
    }

    # Look up the new tender to get full details
    if new_tender_name:
        tender_doc = await get_db().tenders.find_one({"tender_name": new_tender_name}, {"_id": 0})
        if tender_doc:
            update_data["tender"] = tender_doc.get("id")
            update_data["tender_no"] = tender_doc.get("tender_no")
            update_data["tender_name"] = new_tender_name
        else:
            update_data["tender_name"] = new_tender_name
    else:
        # No tender selected — clear tender fields
        update_data["tender"] = None
        update_data["tender_no"] = None
        update_data["tender_name"] = None

    # Always set plant (even if None, to clear old value)
    update_data["plant"] = new_plant or None

    # Record shift history entry
    shift_entry = {
        "date": now_ist(),
        "old_vehicle_no": old_vehicle_no,
        "new_vehicle_no": new_vehicle_no,
        "old_tender": old_tender_name,
        "new_tender": new_tender_name,
        "old_plant": vehicle.get("plant"),
        "new_plant": new_plant,
        "noc_applied": bool(body.get("noc_applied")),
        "noc_obtained": bool(body.get("noc_obtained")),
        "loe_obtained": bool(body.get("loe_obtained")),
        "shifted_by": current_user.get("sub"),
        "shifted_by_name": current_user.get("name", "Unknown"),
    }

    await get_db().vehicles.update_one(
        {"id": vehicle["id"]},
        {"$set": update_data, "$push": {"shift_history": shift_entry}}
    )

    # 1. Remove old vehicle_no from old tender's assigned_vehicles
    if old_tender_name:
        await get_db().tenders.update_one(
            {"tender_name": old_tender_name},
            {"$pull": {"assigned_vehicles": old_vehicle_no}}
        )

    # 2. Add new vehicle_no to new tender's assigned_vehicles
    if new_tender_name:
        await get_db().tenders.update_one(
            {"tender_name": new_tender_name},
            {"$addToSet": {"assigned_vehicles": new_vehicle_no}}
        )

    # 3. If vehicle has an assigned driver, update allocated_vehicle and sync plant
    if vehicle.get("assigned_driver_id"):
        driver_update = {
            "allocated_vehicle": new_vehicle_no,
            "updated_at": now_ist()
        }
        if new_plant:
            driver_update["plant"] = new_plant
        await get_db().drivers.update_one(
            {"id": vehicle["assigned_driver_id"]},
            {"$set": driver_update}
        )

    updated = await get_db().vehicles.find_one({"id": vehicle["id"]}, {"_id": 0})
    return updated

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
