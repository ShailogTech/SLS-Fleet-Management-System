from fastapi import APIRouter, HTTPException, Depends, Query
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from models.driver import Driver, DriverCreate
from utils.permissions import get_current_user
from utils.jwt import get_password_hash
from typing import List, Optional
import os
import uuid
import logging
from datetime import datetime
from utils.plant_helpers import get_incharge_plant_names

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("")
async def get_drivers(
    status: Optional[str] = Query(None),
    plant: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    query = {}
    VALID_STATUSES = {"active", "inactive", "pending", "rejected", "blacklisted"}
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query["status"] = status
    if plant:
        if not isinstance(plant, str) or len(plant) > 100:
            raise HTTPException(status_code=400, detail="Invalid plant filter")
        query["plant"] = plant

    user_role = current_user.get("role")
    if user_role == "driver":
        user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
        if user_info and user_info.get("emp_id"):
            query["emp_id"] = user_info["emp_id"]
    elif user_role == "plant_incharge":
        user_info = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
        plant_names = await get_incharge_plant_names(db, current_user["sub"], user_info.get("plant") if user_info else None)
        if plant_names:
            query["plant"] = {"$in": plant_names}

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

@router.post("")
async def create_driver(driver_data: DriverCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().drivers.find_one({"emp_id": driver_data.emp_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    driver = Driver(**driver_data.model_dump())
    driver.submitted_by = current_user["sub"]

    # Admin/superuser bypass approval — directly active
    is_admin = user_role in ["admin", "superuser"]
    driver.status = "active" if is_admin else "pending"

    driver_doc = driver.model_dump()
    driver_doc["created_at"] = driver_doc["created_at"].isoformat()
    driver_doc["updated_at"] = driver_doc["updated_at"].isoformat()
    if driver_doc.get("dl_expiry"):
        driver_doc["dl_expiry"] = driver_doc["dl_expiry"].isoformat()
    if driver_doc.get("hazardous_cert_expiry"):
        driver_doc["hazardous_cert_expiry"] = driver_doc["hazardous_cert_expiry"].isoformat()

    await get_db().drivers.insert_one(driver_doc)

    # Auto-create user account for the driver
    try:
        name_raw = driver_data.name.strip()
        name_key = name_raw.lower().replace(" ", "")
        email = f"{name_key}@sls.com"
        counter = 1
        while await get_db().users.find_one({"email": email}):
            email = f"{name_key}{counter}@sls.com"
            counter += 1
        password = f"{name_key}123"
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": get_password_hash(password),
            "name": name_raw,
            "role": "driver",
            "emp_id": driver_data.emp_id,
            "phone": driver_data.phone,
            "status": "active",
            "created_at": datetime.now().isoformat(),
        }
        await get_db().users.insert_one(user_doc)
        logger.info(f"Auto-created user {email} for driver {name_raw}")
    except Exception as e:
        logger.error(f"Failed to auto-create user for driver {driver_data.name}: {e}")

    # Only create approval record for non-admin users
    if not is_admin:
        from models.approval import Approval
        approval = Approval(entity_type="driver", entity_id=driver.id, submitted_by=current_user["sub"])
        approval_doc = approval.model_dump()
        approval_doc["created_at"] = approval_doc["created_at"].isoformat()
        approval_doc["updated_at"] = approval_doc["updated_at"].isoformat()
        await get_db().approvals.insert_one(approval_doc)

    return driver

@router.put("/{driver_id}")
async def update_driver(driver_id: str, driver_data: dict, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().drivers.find_one({"id": driver_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    allowed = {"name", "emp_id", "phone", "alternate_phone", "email", "dl_no",
               "dl_expiry", "hazardous_cert_expiry", "plant", "allocated_vehicle", "status"}
    update_data = {k: v for k, v in driver_data.items() if k in allowed}
    update_data["updated_at"] = datetime.now().isoformat()
    
    await get_db().drivers.update_one({"id": driver_id}, {"$set": update_data})
    
    # Sync status to driver user account
    if "status" in update_data and existing.get("emp_id"):
        await get_db().users.update_one(
            {"emp_id": existing["emp_id"], "role": "driver"},
            {"$set": {"status": update_data["status"]}}
        )

    updated_driver = await get_db().drivers.find_one({"id": driver_id}, {"_id": 0})
    return updated_driver

@router.post("/{driver_id}/assign-vehicle")
async def assign_vehicle_to_driver(driver_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Assign a vehicle to a driver. Updates both driver and vehicle records."""
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db = get_db()
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    vehicle_no = body.get("vehicle_no")

    # If vehicle_no is empty/null, unassign
    if not vehicle_no:
        old_vehicle_no = driver.get("allocated_vehicle")
        if old_vehicle_no:
            await db.vehicles.update_one(
                {"vehicle_no": old_vehicle_no},
                {"$set": {"assigned_driver_id": None, "assigned_driver_name": None, "updated_at": datetime.now().isoformat()}}
            )
        await db.drivers.update_one(
            {"id": driver_id},
            {"$set": {"allocated_vehicle": None, "updated_at": datetime.now().isoformat()}}
        )
        return {"message": "Vehicle unassigned from driver"}

    # Find the vehicle
    vehicle = await db.vehicles.find_one({"vehicle_no": vehicle_no}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Clear old vehicle's assigned_driver (if driver was assigned to a different vehicle)
    old_vehicle_no = driver.get("allocated_vehicle")
    if old_vehicle_no and old_vehicle_no != vehicle_no:
        await db.vehicles.update_one(
            {"vehicle_no": old_vehicle_no},
            {"$set": {"assigned_driver_id": None, "assigned_driver_name": None, "updated_at": datetime.now().isoformat()}}
        )

    # Clear old driver on this vehicle (if a different driver was assigned to it)
    old_driver_id = vehicle.get("assigned_driver_id")
    if old_driver_id and old_driver_id != driver_id:
        await db.drivers.update_one(
            {"id": old_driver_id},
            {"$set": {"allocated_vehicle": None, "updated_at": datetime.now().isoformat()}}
        )

    # Update driver with new vehicle and sync plant from vehicle
    driver_update = {
        "allocated_vehicle": vehicle_no,
        "updated_at": datetime.now().isoformat()
    }
    if vehicle.get("plant"):
        driver_update["plant"] = vehicle["plant"]
    await db.drivers.update_one({"id": driver_id}, {"$set": driver_update})

    # Update vehicle with new driver
    await db.vehicles.update_one(
        {"id": vehicle["id"]},
        {"$set": {
            "assigned_driver_id": driver_id,
            "assigned_driver_name": driver.get("name"),
            "updated_at": datetime.now().isoformat()
        }}
    )

    return {"message": "Vehicle assigned to driver successfully", "driver_name": driver.get("name"), "vehicle_no": vehicle_no}

@router.delete("/{driver_id}")
async def delete_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await get_db().drivers.delete_one({"id": driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": "Driver deleted successfully"}
