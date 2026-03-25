from fastapi import APIRouter, HTTPException, Depends
def get_db():
    from server import db
    return db

from models.approval import Approval, ApprovalAction
from utils.permissions import get_current_user
from utils.jwt import get_password_hash
from utils.time_helpers import now_ist
from typing import List
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import logging
import uuid

ALLOWED_ENTITY_TYPES = {"vehicle": "vehicles", "driver": "drivers", "profile_edit": "profile_edits"}

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class AdminComment(BaseModel):
    comment: str
    target_role: Optional[str] = None  # 'checker' or 'approver'


@router.get("/queue")
async def get_approval_queue(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")

    try:
        if user_role in ["checker", "operational_manager", "approver", "admin", "superuser"]:
            approvals = await get_db().approvals.find({}, {"_id": 0}).to_list(1000)
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Batch: collect all IDs by type
        db = get_db()
        vehicle_ids, driver_ids, profile_edit_ids, submitter_ids = set(), set(), set(), set()
        entity_keys = []  # (entity_type, entity_id) for doc lookup
        for a in approvals:
            eid = a.get("entity_id")
            etype = a.get("entity_type")
            if etype == "vehicle" and eid: vehicle_ids.add(eid)
            elif etype == "driver" and eid: driver_ids.add(eid)
            elif etype == "profile_edit" and eid: profile_edit_ids.add(eid)
            if eid and etype: entity_keys.append((etype, eid))
            if a.get("submitted_by"): submitter_ids.add(a["submitted_by"])

        # Batch fetch entities
        vehicles_map, drivers_map, edits_map, users_map = {}, {}, {}, {}
        if vehicle_ids:
            docs = await db.vehicles.find({"id": {"$in": list(vehicle_ids)}}, {"_id": 0}).to_list(1000)
            vehicles_map = {d["id"]: d for d in docs}
        if driver_ids:
            docs = await db.drivers.find({"id": {"$in": list(driver_ids)}}, {"_id": 0}).to_list(1000)
            drivers_map = {d["id"]: d for d in docs}
        if profile_edit_ids:
            docs = await db.profile_edits.find({"id": {"$in": list(profile_edit_ids)}}, {"_id": 0}).to_list(1000)
            edits_map = {d["id"]: d for d in docs}
        if submitter_ids:
            docs = await db.users.find({"id": {"$in": list(submitter_ids)}}, {"_id": 0, "password_hash": 0}).to_list(1000)
            users_map = {d["id"]: d for d in docs}

        # Batch fetch documents
        all_entity_ids = list(vehicle_ids | driver_ids | profile_edit_ids)
        docs_map = {}
        if all_entity_ids:
            all_docs = await db.documents.find({"entity_id": {"$in": all_entity_ids}}, {"_id": 0, "file_content_b64": 0}).to_list(5000)
            for doc in all_docs:
                key = (doc.get("entity_type"), doc.get("entity_id"))
                docs_map.setdefault(key, []).append(doc)

        # Build result
        result = []
        for approval in approvals:
            eid = approval.get("entity_id")
            etype = approval.get("entity_type")
            if etype == "vehicle": entity_data = vehicles_map.get(eid)
            elif etype == "driver": entity_data = drivers_map.get(eid)
            elif etype == "profile_edit": entity_data = edits_map.get(eid)
            else: entity_data = None

            result.append({
                **approval,
                "entity_data": entity_data,
                "submitter": users_map.get(approval.get("submitted_by")),
                "documents": docs_map.get((etype, eid), [])
            })

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching approval queue: {str(e)}")
        raise HTTPException(status_code=500, detail="Error loading approvals. Please try again.")


@router.get("/my-submissions")
async def get_my_submissions(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    # Admin/superuser see ALL submissions; others see only their own
    if user_role in ["admin", "superuser"]:
        query = {}
    else:
        query = {"submitted_by": current_user["sub"]}
    submissions = await get_db().approvals.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    db = get_db()

    # Batch fetch checker/approver/submitter names
    user_ids = set()
    for s in submissions:
        if s.get("checker_id"): user_ids.add(s["checker_id"])
        if s.get("approver_id"): user_ids.add(s["approver_id"])
        if s.get("submitted_by"): user_ids.add(s["submitted_by"])
    users_map = {}
    if user_ids:
        users = await db.users.find({"id": {"$in": list(user_ids)}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
        users_map = {u["id"]: u.get("name", "Unknown") for u in users}

    result = []
    for submission in submissions:
        entity_data = None
        if submission.get("entity_type") == "vehicle":
            entity_data = await db.vehicles.find_one({"id": submission["entity_id"]}, {"_id": 0})
        elif submission.get("entity_type") == "driver":
            entity_data = await db.drivers.find_one({"id": submission["entity_id"]}, {"_id": 0})
        elif submission.get("entity_type") == "profile_edit":
            entity_data = await db.profile_edits.find_one({"id": submission["entity_id"]}, {"_id": 0})

        documents = await db.documents.find(
            {"entity_type": submission.get("entity_type"), "entity_id": submission["entity_id"]},
            {"_id": 0, "file_content_b64": 0}
        ).to_list(50)

        result.append({
            **submission,
            "entity_data": entity_data,
            "documents": documents,
            "checker_name": users_map.get(submission.get("checker_id")),
            "approver_name": users_map.get(submission.get("approver_id")),
            "submitter_name": users_map.get(submission.get("submitted_by")),
        })

    return result


@router.post("/{approval_id}/check")
async def check_approval(approval_id: str, action: ApprovalAction, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    # Checker and operational_manager can perform the check/review action
    if user_role not in ["checker", "operational_manager"]:
        raise HTTPException(status_code=403, detail="Only checkers and operational managers can perform this action")

    approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail="Approval already processed")

    update_data = {
        "checker_id": current_user["sub"],
        "checker_comment": action.comment,
        "checker_action_at": now_ist(),
        "updated_at": now_ist()
    }

    if action.action == "approve":
        update_data["status"] = "checked"
    elif action.action == "reject":
        update_data["status"] = "rejected"
        entity_type = approval.get("entity_type")
        collection_name = ALLOWED_ENTITY_TYPES.get(entity_type)
        if not collection_name:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        await get_db()[collection_name].update_one(
            {"id": approval["entity_id"]},
            {"$set": {"status": "rejected", "updated_at": now_ist()}}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await get_db().approvals.update_one({"id": approval_id}, {"$set": update_data})
    updated_approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    return updated_approval


@router.post("/{approval_id}/approve")
async def approve_approval(approval_id: str, action: ApprovalAction, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    # Only approver can approve - NOT admin/superuser
    if user_role != "approver":
        raise HTTPException(status_code=403, detail="Only approvers can perform this action")

    approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval["status"] != "checked":
        raise HTTPException(status_code=400, detail="Approval must be checked first")

    update_data = {
        "approver_id": current_user["sub"],
        "approver_comment": action.comment,
        "approver_action_at": now_ist(),
        "updated_at": now_ist()
    }

    entity_type = approval.get("entity_type")
    collection_name = ALLOWED_ENTITY_TYPES.get(entity_type)
    if not collection_name:
        raise HTTPException(status_code=400, detail="Invalid entity type")

    if action.action == "approve":
        update_data["status"] = "approved"
        if entity_type != "profile_edit":
            await get_db()[collection_name].update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "active", "updated_at": now_ist()}}
            )
            # Auto-create or activate user account for approved driver
            if entity_type == "driver":
                try:
                    db = get_db()
                    driver_doc = await db.drivers.find_one({"id": approval["entity_id"]}, {"_id": 0})
                    if driver_doc:
                        existing_user = await db.users.find_one({"emp_id": driver_doc.get("emp_id")}, {"_id": 0})
                        if existing_user:
                            await db.users.update_one(
                                {"id": existing_user["id"]},
                                {"$set": {"status": "active", "updated_at": now_ist()}}
                            )
                        else:
                            driver_name = driver_doc.get("name", "driver")
                            first_name = driver_name.split()[0].lower() if driver_name else "driver"
                            base_email = f"{first_name}@slts.com"
                            email = base_email
                            counter = 1
                            while await db.users.find_one({"email": email}):
                                email = f"{first_name}{counter}@slts.com"
                                counter += 1
                            password = f"{first_name}123"
                            user_id = str(uuid.uuid4())
                            user_doc = {
                                "id": user_id,
                                "name": driver_name,
                                "email": email,
                                "password_hash": get_password_hash(password),
                                "role": "driver",
                                "emp_id": driver_doc.get("emp_id"),
                                "phone": driver_doc.get("phone"),
                                "status": "active",
                                "created_at": now_ist(),
                            }
                            await db.users.insert_one(user_doc)
                            logger.info(f"Auto-created user {email} for driver {driver_name}")
                except Exception as e:
                    logger.error(f"Failed to create/activate user for driver {approval.get('entity_id')}: {str(e)}")
        else:
            await get_db().profile_edits.update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "approved", "updated_at": now_ist()}}
            )
    elif action.action == "reject":
        update_data["status"] = "rejected"
        await get_db()[collection_name].update_one(
            {"id": approval["entity_id"]},
            {"$set": {"status": "rejected", "updated_at": now_ist()}}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await get_db().approvals.update_one({"id": approval_id}, {"$set": update_data})
    updated_approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    return updated_approval


@router.post("/{approval_id}/admin-action")
async def admin_direct_action(approval_id: str, action: ApprovalAction, current_user: dict = Depends(get_current_user)):
    """Admin/superuser can directly approve or reject, bypassing checker→approver flow."""
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Only admin/superuser can perform direct actions")

    approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval["status"] in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Approval already finalized")

    entity_type = approval.get("entity_type")
    collection_name = ALLOWED_ENTITY_TYPES.get(entity_type)
    if not collection_name:
        raise HTTPException(status_code=400, detail="Invalid entity type")

    # Fetch admin user name for display
    db = get_db()
    admin_user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "name": 1})
    admin_name = admin_user.get("name", "Admin") if admin_user else "Admin"

    update_data = {
        "admin_approved_by": current_user["sub"],
        "admin_approved_by_name": admin_name,
        "admin_action_at": now_ist(),
        "admin_action_comment": action.comment,
        "updated_at": now_ist()
    }

    if action.action == "approve":
        update_data["status"] = "approved"
        if entity_type != "profile_edit":
            await db[collection_name].update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "active", "updated_at": now_ist()}}
            )
            # Auto-create or activate user account for approved driver
            if entity_type == "driver":
                try:
                    driver_doc = await db.drivers.find_one({"id": approval["entity_id"]}, {"_id": 0})
                    if driver_doc:
                        existing_user = await db.users.find_one({"emp_id": driver_doc.get("emp_id")}, {"_id": 0})
                        if existing_user:
                            await db.users.update_one(
                                {"id": existing_user["id"]},
                                {"$set": {"status": "active", "updated_at": now_ist()}}
                            )
                        else:
                            driver_name = driver_doc.get("name", "driver")
                            first_name = driver_name.split()[0].lower() if driver_name else "driver"
                            email = f"{first_name}@slts.com"
                            counter = 1
                            while await db.users.find_one({"email": email}):
                                email = f"{first_name}{counter}@slts.com"
                                counter += 1
                            user_doc = {
                                "id": str(uuid.uuid4()),
                                "name": driver_name,
                                "email": email,
                                "password_hash": get_password_hash(f"{first_name}123"),
                                "role": "driver",
                                "emp_id": driver_doc.get("emp_id"),
                                "phone": driver_doc.get("phone"),
                                "status": "active",
                                "created_at": now_ist(),
                            }
                            await db.users.insert_one(user_doc)
                            logger.info(f"Auto-created user {email} for driver {driver_name}")
                except Exception as e:
                    logger.error(f"Failed to create/activate user for driver: {str(e)}")
        else:
            await db.profile_edits.update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "approved", "updated_at": now_ist()}}
            )
    elif action.action == "reject":
        update_data["status"] = "rejected"
        await db[collection_name].update_one(
            {"id": approval["entity_id"]},
            {"$set": {"status": "rejected", "updated_at": now_ist()}}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.approvals.update_one({"id": approval_id}, {"$set": update_data})
    updated_approval = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
    return updated_approval


@router.post("/{approval_id}/comment")
async def add_admin_comment(approval_id: str, data: AdminComment, current_user: dict = Depends(get_current_user)):
    """Admin/superuser can add a comment/query to an approval without taking action."""
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Only admin can add comments")

    db = get_db()
    approval = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    # Fetch actual user name from DB since JWT doesn't contain name
    admin_user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "name": 1})
    admin_name = admin_user.get("name", "Admin") if admin_user else "Admin"

    comment_entry = {
        "by": current_user["sub"],
        "by_name": admin_name,
        "role": user_role,
        "comment": data.comment,
        "target_role": data.target_role,
        "created_at": now_ist()
    }

    await get_db().approvals.update_one(
        {"id": approval_id},
        {
            "$push": {"admin_comments": comment_entry},
            "$set": {"updated_at": now_ist()}
        }
    )

    return {"message": "Comment added successfully", "comment": comment_entry}
