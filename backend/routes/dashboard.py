from fastapi import APIRouter, Depends
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from utils.permissions import get_current_user
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_vehicles = await get_db().vehicles.count_documents({})
    active_vehicles = await get_db().vehicles.count_documents({"status": "active"})
    pending_vehicles = await get_db().vehicles.count_documents({"status": "pending"})
    
    total_drivers = await get_db().drivers.count_documents({})
    active_drivers = await get_db().drivers.count_documents({"status": "active"})
    
    total_tenders = await get_db().tenders.count_documents({})
    active_tenders = await get_db().tenders.count_documents({"status": "active"})
    
    pending_approvals = await get_db().approvals.count_documents({"status": {"$in": ["pending", "checked"]}})
    
    today = datetime.now().date().isoformat()
    thirty_days = (datetime.now() + timedelta(days=30)).date().isoformat()
    
    expiring_docs = 0
    vehicles = await get_db().vehicles.find({}, {"_id": 0, "documents": 1}).to_list(1000)
    for vehicle in vehicles:
        if vehicle.get("documents"):
            for key, value in vehicle["documents"].items():
                if value and isinstance(value, str):
                    if today <= value <= thirty_days:
                        expiring_docs += 1
    
    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "pending_vehicles": pending_vehicles,
        "total_drivers": total_drivers,
        "active_drivers": active_drivers,
        "total_tenders": total_tenders,
        "active_tenders": active_tenders,
        "pending_approvals": pending_approvals,
        "expiring_documents": expiring_docs
    }

@router.get("/alerts")
async def get_document_alerts(current_user: dict = Depends(get_current_user)):
    today = datetime.now().date().isoformat()
    thirty_days = (datetime.now() + timedelta(days=30)).date().isoformat()
    
    alerts = []
    
    vehicles = await get_db().vehicles.find({}, {"_id": 0}).to_list(1000)
    for vehicle in vehicles:
        if vehicle.get("documents"):
            for doc_type, expiry_date in vehicle["documents"].items():
                if expiry_date and isinstance(expiry_date, str):
                    if expiry_date < today:
                        alerts.append({
                            "type": "expired",
                            "entity_type": "vehicle",
                            "entity_id": vehicle["id"],
                            "entity_name": vehicle["vehicle_no"],
                            "document_type": doc_type,
                            "expiry_date": expiry_date,
                            "priority": "high"
                        })
                    elif today <= expiry_date <= thirty_days:
                        alerts.append({
                            "type": "expiring_soon",
                            "entity_type": "vehicle",
                            "entity_id": vehicle["id"],
                            "entity_name": vehicle["vehicle_no"],
                            "document_type": doc_type,
                            "expiry_date": expiry_date,
                            "priority": "medium"
                        })
    
    drivers = await get_db().drivers.find({}, {"_id": 0}).to_list(1000)
    for driver in drivers:
        if driver.get("dl_expiry"):
            expiry = driver["dl_expiry"]
            if isinstance(expiry, str):
                if expiry < today:
                    alerts.append({
                        "type": "expired",
                        "entity_type": "driver",
                        "entity_id": driver["id"],
                        "entity_name": driver["name"],
                        "document_type": "dl_expiry",
                        "expiry_date": expiry,
                        "priority": "high"
                    })
                elif today <= expiry <= thirty_days:
                    alerts.append({
                        "type": "expiring_soon",
                        "entity_type": "driver",
                        "entity_id": driver["id"],
                        "entity_name": driver["name"],
                        "document_type": "dl_expiry",
                        "expiry_date": expiry,
                        "priority": "medium"
                    })
        
        if driver.get("hazardous_cert_expiry"):
            expiry = driver["hazardous_cert_expiry"]
            if isinstance(expiry, str):
                if expiry < today:
                    alerts.append({
                        "type": "expired",
                        "entity_type": "driver",
                        "entity_id": driver["id"],
                        "entity_name": driver["name"],
                        "document_type": "hazardous_cert_expiry",
                        "expiry_date": expiry,
                        "priority": "high"
                    })
                elif today <= expiry <= thirty_days:
                    alerts.append({
                        "type": "expiring_soon",
                        "entity_type": "driver",
                        "entity_id": driver["id"],
                        "entity_name": driver["name"],
                        "document_type": "hazardous_cert_expiry",
                        "expiry_date": expiry,
                        "priority": "medium"
                    })
    
    alerts.sort(key=lambda x: (x["priority"], x["expiry_date"]))
    
    return alerts
