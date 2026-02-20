from fastapi import APIRouter, HTTPException, Depends
def get_db():
    from server import db
    return db

from models.approval import Approval, ApprovalAction
from utils.permissions import get_current_user
from utils.jwt import get_password_hash
from typing import List
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class AdminComment(BaseModel):
    comment: str
    target_role: Optional[str] = None  # 'checker' or 'approver'


@router.get("/queue")
async def get_approval_queue(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")

    try:
        if user_role in ["checker", "operational_manager"]:
            approvals = await get_db().approvals.find({"status": "pending"}, {"_id": 0}).to_list(1000)
        elif user_role == "approver":
            approvals = await get_db().approvals.find({"status": "checked"}, {"_id": 0}).to_list(1000)
        elif user_role in ["admin", "superuser"]:
            approvals = await get_db().approvals.find({}, {"_id": 0}).to_list(1000)
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        result = []
        for approval in approvals:
            try:
                entity_data = None
                if approval.get("entity_type") == "vehicle":
                    entity_data = await get_db().vehicles.find_one({"id": approval["entity_id"]}, {"_id": 0})
                elif approval.get("entity_type") == "driver":
                    entity_data = await get_db().drivers.find_one({"id": approval["entity_id"]}, {"_id": 0})
                elif approval.get("entity_type") == "profile_edit":
                    entity_data = await get_db().profile_edits.find_one({"id": approval["entity_id"]}, {"_id": 0})

                submitter = None
                if approval.get("submitted_by"):
                    submitter = await get_db().users.find_one({"id": approval["submitted_by"]}, {"_id": 0, "password_hash": 0})

                # Fetch uploaded documents for this entity
                documents = await get_db().documents.find(
                    {"entity_type": approval.get("entity_type"), "entity_id": approval.get("entity_id")},
                    {"_id": 0}
                ).to_list(50)

                result.append({
                    **approval,
                    "entity_data": entity_data,
                    "submitter": submitter,
                    "documents": documents
                })
            except Exception as e:
                logger.error(f"Error enriching approval {approval.get('id')}: {str(e)}")
                result.append({
                    **approval,
                    "entity_data": None,
                    "submitter": None,
                    "documents": []
                })

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching approval queue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading approvals: {str(e)}")


@router.get("/my-submissions")
async def get_my_submissions(current_user: dict = Depends(get_current_user)):
    submissions = await get_db().approvals.find(
        {"submitted_by": current_user["sub"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    result = []
    for submission in submissions:
        entity_data = None
        if submission.get("entity_type") == "vehicle":
            entity_data = await get_db().vehicles.find_one({"id": submission["entity_id"]}, {"_id": 0})
        elif submission.get("entity_type") == "driver":
            entity_data = await get_db().drivers.find_one({"id": submission["entity_id"]}, {"_id": 0})
        elif submission.get("entity_type") == "profile_edit":
            entity_data = await get_db().profile_edits.find_one({"id": submission["entity_id"]}, {"_id": 0})

        documents = await get_db().documents.find(
            {"entity_type": submission.get("entity_type"), "entity_id": submission["entity_id"]},
            {"_id": 0}
        ).to_list(50)

        result.append({
            **submission,
            "entity_data": entity_data,
            "documents": documents
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
        "checker_action_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    if action.action == "approve":
        update_data["status"] = "checked"
    elif action.action == "reject":
        update_data["status"] = "rejected"
        collection_name = f"{approval['entity_type']}s"
        if collection_name != "profile_edits":
            await get_db()[collection_name].update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "rejected", "updated_at": datetime.now().isoformat()}}
            )
        else:
            await get_db().profile_edits.update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "rejected", "updated_at": datetime.now().isoformat()}}
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
        "approver_action_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    if action.action == "approve":
        update_data["status"] = "approved"
        collection_name = f"{approval['entity_type']}s"
        if collection_name != "profile_edits":
            await get_db()[collection_name].update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "active", "updated_at": datetime.now().isoformat()}}
            )
            # Activate the driver's user account (created when driver was added)
            if approval["entity_type"] == "driver":
                try:
                    driver_doc = await get_db().drivers.find_one({"id": approval["entity_id"]}, {"_id": 0})
                    if driver_doc:
                        await get_db().users.update_one(
                            {"emp_id": driver_doc.get("emp_id")},
                            {"$set": {"status": "active", "updated_at": datetime.now().isoformat()}}
                        )
                except Exception as e:
                    logger.error(f"Failed to activate user for driver {approval.get('entity_id')}: {str(e)}")
        else:
            await get_db().profile_edits.update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "approved", "updated_at": datetime.now().isoformat()}}
            )
    elif action.action == "reject":
        update_data["status"] = "rejected"
        collection_name = f"{approval['entity_type']}s"
        if collection_name != "profile_edits":
            await get_db()[collection_name].update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "rejected", "updated_at": datetime.now().isoformat()}}
            )
        else:
            await get_db().profile_edits.update_one(
                {"id": approval["entity_id"]},
                {"$set": {"status": "rejected", "updated_at": datetime.now().isoformat()}}
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await get_db().approvals.update_one({"id": approval_id}, {"$set": update_data})
    updated_approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    return updated_approval


@router.post("/{approval_id}/comment")
async def add_admin_comment(approval_id: str, data: AdminComment, current_user: dict = Depends(get_current_user)):
    """Admin/superuser can add a comment/query to an approval without taking action."""
    user_role = current_user.get("role")
    if user_role not in ["admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Only admin can add comments")

    approval = await get_db().approvals.find_one({"id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    comment_entry = {
        "by": current_user["sub"],
        "by_name": current_user.get("name", "Admin"),
        "role": user_role,
        "comment": data.comment,
        "target_role": data.target_role,
        "created_at": datetime.now().isoformat()
    }

    await get_db().approvals.update_one(
        {"id": approval_id},
        {
            "$push": {"admin_comments": comment_entry},
            "$set": {"updated_at": datetime.now().isoformat()}
        }
    )

    return {"message": "Comment added successfully", "comment": comment_entry}
