from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from utils.permissions import get_current_user
from utils.time_helpers import now_ist
from typing import Optional
from datetime import datetime
import uuid
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentMetadataBody(BaseModel):
    entity_type: str
    entity_id: str
    document_type: str
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None

def get_db():
    from server import db
    return db

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB


async def _sync_vehicle_expiry(db, entity_id: str, document_type: str, expiry_date: str):
    """Sync expiry date back to vehicle documents sub-object, handling null documents."""
    doc_type_map = {
        "rc": "rc_expiry", "registration": "rc_expiry",
        "insurance": "insurance_expiry",
        "fitness": "fitness_expiry", "fc": "fitness_expiry",
        "tax": "tax_expiry",
        "puc": "puc_expiry", "pollution": "puc_expiry",
        "permit": "permit_expiry",
        "national_permit": "national_permit_expiry", "np": "national_permit_expiry",
        "cll_addition": "cll_addition_expiry",
        "temp_permit": "temp_permit_expiry",
    }
    doc_key = doc_type_map.get(document_type.lower())
    if doc_key:
        # Initialize documents to {} if it's null — MongoDB can't use dot notation on null
        await db.vehicles.update_one(
            {"id": entity_id, "documents": None},
            {"$set": {"documents": {}}}
        )
        await db.vehicles.update_one(
            {"id": entity_id},
            {"$set": {f"documents.{doc_key}": expiry_date}}
        )


async def _sync_driver_expiry(db, entity_id: str, document_type: str, expiry_date: str):
    """Sync expiry date back to driver record."""
    driver_update = {}
    if document_type == "dl":
        driver_update["dl_expiry"] = expiry_date
    elif document_type == "hazardous":
        driver_update["hazardous_cert_expiry"] = expiry_date
    if driver_update:
        await db.drivers.update_one({"id": entity_id}, {"$set": driver_update})


@router.post("/metadata")
async def create_document_metadata(
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    document_type: str = Form(...),
    document_number: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    issuing_authority: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    user_role = current_user.get("role")
    if user_role not in ["maker", "admin", "superuser", "office_incharge", "records_incharge", "checker", "operational_manager", "approver"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db = get_db()

    # Dedup: if a document with same entity_type + entity_id + document_type exists, update it
    existing = await db.documents.find_one(
        {"entity_type": entity_type, "entity_id": entity_id, "document_type": document_type},
        {"_id": 0}
    )
    if existing:
        update_fields = {"updated_at": now_ist()}
        if document_number: update_fields["document_number"] = document_number
        if issue_date: update_fields["issue_date"] = issue_date
        if expiry_date: update_fields["expiry_date"] = expiry_date
        if issuing_authority: update_fields["issuing_authority"] = issuing_authority
        await db.documents.update_one({"id": existing["id"]}, {"$set": update_fields})
        updated = await db.documents.find_one({"id": existing["id"]}, {"_id": 0})

        if entity_type == "driver" and expiry_date:
            await _sync_driver_expiry(db, entity_id, document_type, expiry_date)
        if entity_type == "vehicle" and expiry_date:
            await _sync_vehicle_expiry(db, entity_id, document_type, expiry_date)

        return {"message": "Document metadata updated (existing).", "document": updated}

    doc_id = str(uuid.uuid4())
    document_record = {
        "id": doc_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "document_type": document_type,
        "document_number": document_number,
        "issue_date": issue_date,
        "expiry_date": expiry_date,
        "issuing_authority": issuing_authority,
        "filename": None,
        "file_path": None,
        "file_url": None,
        "uploaded_by": current_user["sub"],
        "created_at": now_ist(),
        "updated_at": now_ist(),
        "status": "pending_upload"
    }

    await db.documents.insert_one(document_record)
    del document_record["_id"]

    if entity_type == "driver" and expiry_date:
        await _sync_driver_expiry(db, entity_id, document_type, expiry_date)
    if entity_type == "vehicle" and expiry_date:
        await _sync_vehicle_expiry(db, entity_id, document_type, expiry_date)

    return {"message": "Document metadata saved.", "document": document_record}


@router.post("/save-metadata")
async def save_document_metadata_json(
    body: DocumentMetadataBody,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = current_user.get("role")
        if user_role not in ["maker", "admin", "superuser", "office_incharge", "records_incharge", "checker", "operational_manager", "approver"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        db = get_db()

        # Dedup: if a document with same entity_type + entity_id + document_type exists, update it
        existing = await db.documents.find_one(
            {"entity_type": body.entity_type, "entity_id": body.entity_id, "document_type": body.document_type},
            {"_id": 0}
        )
        if existing:
            update_fields = {"updated_at": now_ist()}
            if body.document_number: update_fields["document_number"] = body.document_number
            if body.issue_date: update_fields["issue_date"] = body.issue_date
            if body.expiry_date: update_fields["expiry_date"] = body.expiry_date
            if body.issuing_authority: update_fields["issuing_authority"] = body.issuing_authority
            await db.documents.update_one({"id": existing["id"]}, {"$set": update_fields})
            updated = await db.documents.find_one({"id": existing["id"]}, {"_id": 0, "file_content_b64": 0})

            if body.entity_type == "driver" and body.expiry_date:
                await _sync_driver_expiry(db, body.entity_id, body.document_type, body.expiry_date)
            if body.entity_type == "vehicle" and body.expiry_date:
                await _sync_vehicle_expiry(db, body.entity_id, body.document_type, body.expiry_date)

            return {"message": "Document metadata updated (existing).", "document": updated}

        doc_id = str(uuid.uuid4())
        document_record = {
            "id": doc_id,
            "entity_type": body.entity_type,
            "entity_id": body.entity_id,
            "document_type": body.document_type,
            "document_number": body.document_number,
            "issue_date": body.issue_date,
            "expiry_date": body.expiry_date,
            "issuing_authority": body.issuing_authority,
            "filename": None,
            "file_path": None,
            "file_url": None,
            "uploaded_by": current_user["sub"],
            "created_at": now_ist(),
            "updated_at": now_ist(),
            "status": "pending_upload"
        }

        await db.documents.insert_one(document_record)
        del document_record["_id"]

        if body.entity_type == "driver" and body.expiry_date:
            await _sync_driver_expiry(db, body.entity_id, body.document_type, body.expiry_date)
        if body.entity_type == "vehicle" and body.expiry_date:
            await _sync_vehicle_expiry(db, body.entity_id, body.document_type, body.expiry_date)

        return {"message": "Document metadata saved.", "document": document_record}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save metadata error: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to save metadata. Please try again."})


@router.post("/{doc_id}/attach")
async def attach_file_to_document(
    doc_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, JPG, or PNG.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB.")

    await db.documents.update_one({"id": doc_id}, {"$set": {
        "filename": file.filename,
        "file_url": f"/api/documents/file/{doc_id}{file_ext}",
        "file_content_b64": base64.b64encode(content).decode('utf-8'),
        "file_content_type": file.content_type or "application/octet-stream",
        "status": "uploaded",
        "updated_at": now_ist()
    }})

    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0, "file_content_b64": 0})
    return {"message": "File attached successfully", "document": updated}


@router.post("/upload")
async def upload_document(
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    document_type: str = Form(...),
    document_number: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    issuing_authority: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, JPG, or PNG.")

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 25MB.")
        db = get_db()

        # Dedup: if a document with same entity_type + entity_id + document_type exists, update it
        existing = await db.documents.find_one(
            {"entity_type": entity_type, "entity_id": entity_id, "document_type": document_type},
            {"_id": 0}
        )
        if existing:
            file_id = existing["id"]
            await db.documents.update_one({"id": file_id}, {"$set": {
                "document_number": document_number or existing.get("document_number"),
                "issue_date": issue_date or existing.get("issue_date"),
                "expiry_date": expiry_date or existing.get("expiry_date"),
                "issuing_authority": issuing_authority or existing.get("issuing_authority"),
                "filename": file.filename,
                "file_url": f"/api/documents/file/{file_id}{file_ext}",
                "file_content_b64": base64.b64encode(content).decode('utf-8'),
                "file_content_type": file.content_type or "application/octet-stream",
                "status": "uploaded",
                "updated_at": now_ist()
            }})
            updated = await db.documents.find_one({"id": file_id}, {"_id": 0, "file_content_b64": 0})

            if entity_type == "driver" and expiry_date:
                await _sync_driver_expiry(db, entity_id, document_type, expiry_date)
            if entity_type == "vehicle" and expiry_date:
                await _sync_vehicle_expiry(db, entity_id, document_type, expiry_date)

            return {"message": "Document updated successfully", "document": updated}

        file_id = str(uuid.uuid4())
        document_record = {
            "id": file_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "document_type": document_type,
            "document_number": document_number,
            "issue_date": issue_date,
            "expiry_date": expiry_date,
            "issuing_authority": issuing_authority,
            "filename": file.filename,
            "file_url": f"/api/documents/file/{file_id}{file_ext}",
            "file_content_b64": base64.b64encode(content).decode('utf-8'),
            "file_content_type": file.content_type or "application/octet-stream",
            "uploaded_by": current_user["sub"],
            "created_at": now_ist(),
            "updated_at": now_ist(),
            "status": "uploaded"
        }

        await db.documents.insert_one(document_record)
        del document_record["_id"]
        document_record.pop("file_content_b64", None)

        if entity_type == "driver" and expiry_date:
            await _sync_driver_expiry(db, entity_id, document_type, expiry_date)
        if entity_type == "vehicle" and expiry_date:
            await _sync_vehicle_expiry(db, entity_id, document_type, expiry_date)

        return {"message": "Document uploaded successfully", "document": document_record}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Upload failed. Please try again."},
        )


@router.get("/file/{filename}")
async def serve_document_file(filename: str):
    """Serve document file from MongoDB. No auth required — URLs contain unguessable UUIDs."""
    doc_id = filename.rsplit('.', 1)[0] if '.' in filename else filename
    db = get_db()
    doc = await db.documents.find_one({"id": doc_id})
    if doc and doc.get("file_content_b64"):
        content = base64.b64decode(doc["file_content_b64"])
        content_type = doc.get("file_content_type", "application/octet-stream")
        return Response(content=content, media_type=content_type)

    raise HTTPException(status_code=404, detail="File not found")


@router.get("/{entity_type}/{entity_id}")
async def get_documents(entity_type: str, entity_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    documents = await db.documents.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0, "file_content_b64": 0}
    ).sort("created_at", -1).to_list(100)
    return documents
