from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.responses import FileResponse, JSONResponse
from utils.permissions import get_current_user
from typing import Optional
from datetime import datetime
import uuid
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_db():
    from server import db
    return db

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}


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

    # Sync expiry date back to vehicle documents
    if entity_type == "vehicle" and expiry_date:
        doc_type_map = {
            "rc": "rc_expiry", "registration": "rc_expiry",
            "insurance": "insurance_expiry",
            "fitness": "fitness_expiry", "fc": "fitness_expiry",
            "tax": "tax_expiry",
            "puc": "puc_expiry", "pollution": "puc_expiry",
            "permit": "permit_expiry",
            "national_permit": "national_permit_expiry", "np": "national_permit_expiry",
        }
        doc_key = doc_type_map.get(document_type.lower())
        if doc_key:
            await get_db().vehicles.update_one(
                {"id": entity_id},
                {"$set": {f"documents.{doc_key}": expiry_date}}
            )

    return JSONResponse(
        content={"message": "Document metadata saved. You can now upload the file.", "document": document_record},
        headers=CORS_HEADERS,
    )


@router.post("/{doc_id}/attach")
async def attach_file_to_document(
    doc_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        db = get_db()
        doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
        if not doc:
            return JSONResponse(
                status_code=404,
                content={"detail": "Document record not found"},
                headers=CORS_HEADERS,
            )

        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            return JSONResponse(
                status_code=400,
                content={"detail": "File type not allowed. Use PDF, JPG, or PNG."},
                headers=CORS_HEADERS,
            )

        content = await file.read()
        filename = f"{doc_id}{file_ext}"
        file_url = f"/api/documents/file/{doc_id}{file_ext}"

        # Try filesystem first, fall back to MongoDB storage
        try:
            file_path = UPLOAD_DIR / filename
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            file_path_str = str(file_path)
        except Exception as fs_err:
            logger.warning(f"Filesystem write failed, storing in MongoDB: {fs_err}")
            file_path_str = None
            # Store file content in MongoDB as base64
            file_b64 = base64.b64encode(content).decode('utf-8')
            await db.documents.update_one({"id": doc_id}, {"$set": {
                "file_content_b64": file_b64,
                "file_content_type": file.content_type or "application/octet-stream",
            }})

        await db.documents.update_one({"id": doc_id}, {"$set": {
            "filename": file.filename,
            "file_path": file_path_str,
            "file_url": file_url,
            "status": "uploaded",
            "updated_at": datetime.now().isoformat()
        }})

        updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
        if updated and "_id" in updated:
            del updated["_id"]
        # Remove large base64 content from response
        if updated and "file_content_b64" in updated:
            del updated["file_content_b64"]

        return JSONResponse(
            content={"message": "File attached successfully", "document": updated},
            headers=CORS_HEADERS,
        )
    except Exception as e:
        logger.error(f"File attach error for {doc_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"File attach failed: {str(e)}"},
            headers=CORS_HEADERS,
        )


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
            return JSONResponse(
                status_code=400,
                content={"detail": "File type not allowed"},
                headers=CORS_HEADERS,
            )

        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        content = await file.read()

        # Try filesystem first, fall back to MongoDB storage
        file_path_str = None
        try:
            file_path = UPLOAD_DIR / filename
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            file_path_str = str(file_path)
        except Exception as fs_err:
            logger.warning(f"Filesystem write failed, storing in MongoDB: {fs_err}")

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
            "file_path": file_path_str,
            "file_url": f"/api/documents/file/{file_id}{file_ext}",
            "uploaded_by": current_user["sub"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": "uploaded"
        }

        # If filesystem failed, store in MongoDB
        if file_path_str is None:
            document_record["file_content_b64"] = base64.b64encode(content).decode('utf-8')
            document_record["file_content_type"] = file.content_type or "application/octet-stream"

        await get_db().documents.insert_one(document_record)
        del document_record["_id"]
        # Remove large base64 from response
        document_record.pop("file_content_b64", None)

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

        # Sync expiry date back to vehicle documents
        if entity_type == "vehicle" and expiry_date:
            doc_type_map = {
                "rc": "rc_expiry", "registration": "rc_expiry",
                "insurance": "insurance_expiry",
                "fitness": "fitness_expiry", "fc": "fitness_expiry",
                "tax": "tax_expiry",
                "puc": "puc_expiry", "pollution": "puc_expiry",
                "permit": "permit_expiry",
                "national_permit": "national_permit_expiry", "np": "national_permit_expiry",
            }
            doc_key = doc_type_map.get(document_type.lower())
            if doc_key:
                await get_db().vehicles.update_one(
                    {"id": entity_id},
                    {"$set": {f"documents.{doc_key}": expiry_date}}
                )

        return JSONResponse(
            content={"message": "Document uploaded successfully", "document": document_record},
            headers=CORS_HEADERS,
        )
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Upload failed: {str(e)}"},
            headers=CORS_HEADERS,
        )


@router.get("/file/{filename}")
async def serve_document_file(filename: str):
    # Try filesystem first
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        return FileResponse(str(file_path))

    # Fall back to MongoDB stored content
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
