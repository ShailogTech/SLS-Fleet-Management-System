from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from utils.permissions import get_current_user
from typing import Optional
from datetime import datetime
import uuid
from pathlib import Path

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_db():
    from server import db
    return db

UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}


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
    if user_role not in ["maker", "admin", "superuser", "office_incharge", "records_incharge"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

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
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "status": "pending_upload"
    }

    await get_db().documents.insert_one(document_record)
    del document_record["_id"]

    # Sync expiry date back to driver record
    if entity_type == "driver" and expiry_date:
        driver_update = {}
        if document_type == "dl":
            driver_update["dl_expiry"] = expiry_date
        elif document_type == "hazardous":
            driver_update["hazardous_cert_expiry"] = expiry_date
        if driver_update:
            await get_db().drivers.update_one(
                {"id": entity_id},
                {"$set": driver_update}
            )

    return {
        "message": "Document metadata saved. You can now upload the file.",
        "document": document_record
    }


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

    filename = f"{doc_id}{file_ext}"
    file_path = UPLOAD_DIR / filename

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    await db.documents.update_one({"id": doc_id}, {"$set": {
        "filename": file.filename,
        "file_path": str(file_path),
        "file_url": f"/api/documents/file/{doc_id}{file_ext}",
        "status": "uploaded",
        "updated_at": datetime.now().isoformat()
    }})

    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
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
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

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
        "file_path": str(file_path),
        "file_url": f"/api/documents/file/{file_id}{file_ext}",
        "uploaded_by": current_user["sub"],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "status": "uploaded"
    }

    await get_db().documents.insert_one(document_record)
    del document_record["_id"]

    # Sync expiry date back to driver record
    if entity_type == "driver" and expiry_date:
        driver_update = {}
        if document_type == "dl":
            driver_update["dl_expiry"] = expiry_date
        elif document_type == "hazardous":
            driver_update["hazardous_cert_expiry"] = expiry_date
        if driver_update:
            await get_db().drivers.update_one(
                {"id": entity_id},
                {"$set": driver_update}
            )

    return {
        "message": "Document uploaded successfully",
        "document": document_record
    }


@router.get("/file/{filename}")
async def serve_document_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@router.get("/{entity_type}/{entity_id}")
async def get_documents(entity_type: str, entity_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    documents = await db.documents.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return documents
