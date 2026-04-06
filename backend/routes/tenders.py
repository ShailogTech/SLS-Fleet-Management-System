from fastapi import APIRouter, HTTPException, Depends
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from models.tender import Tender, TenderCreate
from utils.permissions import get_current_user
from utils.time_helpers import now_ist
from typing import List
import os
from datetime import datetime

router = APIRouter(prefix="/tenders", tags=["Tenders"])


@router.get("")
async def get_tenders(current_user: dict = Depends(get_current_user)):
    tenders = await get_db().tenders.find({}, {"_id": 0}).to_list(1000)
    return tenders

@router.get("/{tender_id}")
async def get_tender(tender_id: str, current_user: dict = Depends(get_current_user)):
    tender = await get_db().tenders.find_one({"id": tender_id}, {"_id": 0})
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender

@router.post("", response_model=Tender)
async def create_tender(tender_data: TenderCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superadmin", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().tenders.find_one({"tender_no": tender_data.tender_no}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Tender number already exists")
    
    tender = Tender(**tender_data.model_dump())
    
    tender_doc = tender.model_dump()
    tender_doc["created_at"] = tender_doc["created_at"].isoformat()
    tender_doc["updated_at"] = tender_doc["updated_at"].isoformat()
    tender_doc["start_date"] = tender_doc["start_date"].isoformat()
    tender_doc["end_date"] = tender_doc["end_date"].isoformat()
    if tender_doc.get("contract_validity"):
        tender_doc["contract_validity"] = tender_doc["contract_validity"].isoformat()
    
    await get_db().tenders.insert_one(tender_doc)

    # Sync: update assigned vehicles with tender info
    if tender.assigned_vehicles:
        await get_db().vehicles.update_many(
            {"vehicle_no": {"$in": tender.assigned_vehicles}},
            {"$set": {
                "tender": tender.id,
                "tender_no": tender.tender_no,
                "tender_name": tender.tender_name,
                "plant": tender.plant or None,
                "updated_at": now_ist()
            }}
        )

    return tender

@router.put("/{tender_id}", response_model=Tender)
async def update_tender(tender_id: str, tender_data: TenderCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superadmin", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().tenders.find_one({"id": tender_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    update_data = tender_data.model_dump()
    update_data["updated_at"] = now_ist()
    update_data["start_date"] = update_data["start_date"].isoformat()
    update_data["end_date"] = update_data["end_date"].isoformat()
    if update_data.get("contract_validity"):
        update_data["contract_validity"] = update_data["contract_validity"].isoformat()
    
    await get_db().tenders.update_one({"id": tender_id}, {"$set": update_data})

    # Sync: diff old vs new assigned_vehicles
    old_vehicles = set(existing.get("assigned_vehicles") or [])
    new_vehicles = set(update_data.get("assigned_vehicles") or [])
    removed = old_vehicles - new_vehicles
    added = new_vehicles - old_vehicles

    tender_name = update_data.get("tender_name", existing.get("tender_name"))
    tender_no = update_data.get("tender_no", existing.get("tender_no"))
    plant = update_data.get("plant", existing.get("plant"))

    if removed:
        await get_db().vehicles.update_many(
            {"vehicle_no": {"$in": list(removed)}},
            {"$set": {"tender": None, "tender_no": None, "tender_name": None, "updated_at": now_ist()}}
        )
    if added:
        await get_db().vehicles.update_many(
            {"vehicle_no": {"$in": list(added)}},
            {"$set": {
                "tender": tender_id,
                "tender_no": tender_no,
                "tender_name": tender_name,
                "plant": plant or None,
                "updated_at": now_ist()
            }}
        )

    updated_tender = await get_db().tenders.find_one({"id": tender_id}, {"_id": 0})
    return updated_tender

@router.delete("/{tender_id}")
async def delete_tender(tender_id: str, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().tenders.find_one({"id": tender_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Clear tender info from all assigned vehicles
    assigned = existing.get("assigned_vehicles") or []
    if assigned:
        await get_db().vehicles.update_many(
            {"vehicle_no": {"$in": assigned}},
            {"$set": {"tender": None, "tender_no": None, "tender_name": None, "updated_at": now_ist()}}
        )

    await get_db().tenders.delete_one({"id": tender_id})
    return {"message": "Tender deleted successfully"}
