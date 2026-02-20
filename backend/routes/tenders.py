from fastapi import APIRouter, HTTPException, Depends
def get_db():
    from server import db
    return db

from motor.motor_asyncio import AsyncIOMotorClient
from models.tender import Tender, TenderCreate
from utils.permissions import get_current_user
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
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
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
    
    return tender

@router.put("/{tender_id}", response_model=Tender)
async def update_tender(tender_id: str, tender_data: TenderCreate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await get_db().tenders.find_one({"id": tender_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    update_data = tender_data.model_dump()
    update_data["updated_at"] = datetime.now().isoformat()
    update_data["start_date"] = update_data["start_date"].isoformat()
    update_data["end_date"] = update_data["end_date"].isoformat()
    if update_data.get("contract_validity"):
        update_data["contract_validity"] = update_data["contract_validity"].isoformat()
    
    await get_db().tenders.update_one({"id": tender_id}, {"$set": update_data})
    
    updated_tender = await get_db().tenders.find_one({"id": tender_id}, {"_id": 0})
    return updated_tender

@router.delete("/{tender_id}")
async def delete_tender(tender_id: str, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await get_db().tenders.delete_one({"id": tender_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    return {"message": "Tender deleted successfully"}
