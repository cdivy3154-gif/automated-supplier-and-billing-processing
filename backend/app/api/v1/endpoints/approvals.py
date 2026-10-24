from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.config import settings
from app.dependencies.auth import get_current_active_user, require_roles
from app.dependencies.db import get_admin_db, get_user_db
from app.schemas.user import UserContext, UserRole
from app.schemas.workflow import (
    ApprovalCreate,
    ApprovalResponse,
    BillWorkflowProgressResponse,
    WorkflowTaskResponse,
)

router = APIRouter()

OFFICER_ROLES = {
    UserRole.ADMIN,
    UserRole.BRANCH_OFFICER,
    UserRole.PRE_AUDITOR,
    UserRole.GENERAL_MANAGER,
    UserRole.FINANCE_OFFICER,
}

# Mapping of stage assigned roles to their required prerequisite bill statuses and next transitions
STAGE_TRANSITIONS = {
    UserRole.BRANCH_OFFICER: {
        "required_bill_status": "SUBMITTED",
        "approved_bill_status": "BRANCH_APPROVED",
        "next_role": UserRole.PRE_AUDITOR,
        "next_remarks": "Awaiting pre-audit verification",
    },
    UserRole.PRE_AUDITOR: {
        "required_bill_status": "BRANCH_APPROVED",
        "approved_bill_status": "PRE_AUDITED",
        "next_role": UserRole.GENERAL_MANAGER,
        "next_remarks": "Awaiting general manager approval",
    },
    UserRole.GENERAL_MANAGER: {
        "required_bill_status": "PRE_AUDITED",
        "approved_bill_status": "GM_APPROVED",
        "next_role": UserRole.FINANCE_OFFICER,
        "next_remarks": "Awaiting final finance verification and payment authorization",
    },
    UserRole.FINANCE_OFFICER: {
        "required_bill_status": "GM_APPROVED",
        "approved_bill_status": "APPROVED",
        "next_role": None,  # Terminal approval
        "next_remarks": None,
    },
}


@router.get(
    "/tasks/pending",
    response_model=List[WorkflowTaskResponse],
    summary="List Pending Workflow Tasks",
    description="Retrieve pending tasks assigned to the caller's role. Administrators can view all pending tasks.",
)
def list_pending_tasks(
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> List[WorkflowTaskResponse]:
    if current_user.role not in OFFICER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view workflow task queues",
        )

    # Use admin_db if available to query tasks cleanly across officer roles
    client = admin_db if admin_db else db
    query = client.table("workflow_tasks").select("*").eq("status", "PENDING")

    # Admins see all pending tasks; officers see tasks for their specific role
    if current_user.role != UserRole.ADMIN:
        query = query.eq("assigned_role", current_user.role.value)

    response = query.order("created_at", desc=False).execute()
    return [WorkflowTaskResponse.model_validate(row) for row in response.data]


@router.get(
    "/tasks/{task_id}",
    response_model=WorkflowTaskResponse,
    summary="Get Workflow Task by ID",
    description="Retrieve single workflow task details.",
)
def get_task_by_id(
    task_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> WorkflowTaskResponse:
    if current_user.role not in OFFICER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view workflow tasks",
        )

    client = admin_db if admin_db else db
    response = client.table("workflow_tasks").select("*").eq("id", str(task_id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow task with ID '{task_id}' not found",
        )

    task_data = response.data[0]
    if current_user.role != UserRole.ADMIN and task_data.get("assigned_role") != current_user.role.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: task is assigned to '{task_data.get('assigned_role')}'",
        )

    return WorkflowTaskResponse.model_validate(task_data)


@router.post(
    "",
    response_model=ApprovalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Process Approval Decision",
    description="Authorized officers approve or reject a bill at their assigned workflow stage.",
)
def process_approval(
    payload: ApprovalCreate,
    current_user: UserContext = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.BRANCH_OFFICER,
            UserRole.PRE_AUDITOR,
            UserRole.GENERAL_MANAGER,
            UserRole.FINANCE_OFFICER,
        )
    ),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> ApprovalResponse:
    clean_decision = payload.decision.strip().upper()
    if clean_decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid decision: must be 'APPROVED' or 'REJECTED'",
        )

    if clean_decision == "REJECTED" and (not payload.comments or not payload.comments.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rejection reason (comments) is mandatory when rejecting a bill",
        )

    # 1. Attempt single-transaction atomic execution via PostgreSQL RPC
    rpc_payload = {
        "p_task_id": str(payload.workflow_task_id),
        "p_decision": clean_decision,
        "p_comments": payload.comments.strip() if payload.comments else None,
        "p_actor_id": current_user.id,
    }

    try:
        rpc_resp = db.rpc("process_approval_atomic", rpc_payload).execute()
        if rpc_resp.data:
            approval_id = rpc_resp.data.get("approval_id")
            # Fetch the recorded approval record
            client = admin_db if admin_db else db
            appr_row = client.table("approvals").select("*").eq("id", approval_id).execute()
            if appr_row.data:
                return ApprovalResponse.model_validate(appr_row.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        err_str = str(exc).lower()
        is_missing_rpc = (
            "pgrst202" in err_str
            or "could not find the function" in err_str
            or ("process_approval_atomic" in err_str and ("not found" in err_str or "does not exist" in err_str))
        )
        if is_missing_rpc:
            if settings.is_production:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Transaction-safe database procedure 'process_approval_atomic' is unavailable in production.",
                )
        else:
            if "insufficient_privilege" in err_str or "not authorized" in err_str:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
            if "already" in err_str or "must be pending" in err_str:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # 2. Hardened fallback application flow using admin_db with compensating rollback
    if not admin_db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Administrative database service is required to process approvals",
        )

    # 2a. Fetch task and verify state
    task_resp = admin_db.table("workflow_tasks").select("*").eq("id", str(payload.workflow_task_id)).execute()
    if not task_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow task with ID '{payload.workflow_task_id}' not found",
        )
    task_data = task_resp.data[0]

    if str(task_data.get("status", "")).upper() != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Workflow task is already in status '{task_data.get('status')}' (must be 'PENDING')",
        )

    assigned_role_str = task_data.get("assigned_role")
    if current_user.role != UserRole.ADMIN and assigned_role_str != current_user.role.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role.value}' cannot act on task assigned to '{assigned_role_str}'",
        )

    bill_id = task_data["bill_id"]
    bill_resp = admin_db.table("bills").select("*").eq("id", str(bill_id)).execute()
    if not bill_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent bill ID '{bill_id}' not found",
        )
    bill_data = bill_resp.data[0]
    current_bill_status = str(bill_data.get("status", "")).upper()

    if current_bill_status in ("REJECTED", "CANCELLED", "PAID"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot act on bill in terminal status '{current_bill_status}'",
        )

    # 2b. Validate stage sequence
    stage_role = UserRole(assigned_role_str)
    stage_config = STAGE_TRANSITIONS.get(stage_role)
    if stage_config and current_bill_status != stage_config["required_bill_status"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid workflow state: stage '{assigned_role_str}' requires bill status "
                f"'{stage_config['required_bill_status']}', but bill is currently '{current_bill_status}'"
            ),
        )

    # 2c. Execute state transition with compensating rollback protection
    created_appr = None
    next_task_id = None
    original_task_status = task_data.get("status")
    original_task_remarks = task_data.get("remarks")

    try:
        approval_record = {
            "bill_id": str(bill_id),
            "workflow_task_id": str(payload.workflow_task_id),
            "approver_id": current_user.id,
            "approver_role": current_user.role.value,
            "decision": clean_decision,
            "comments": payload.comments.strip() if payload.comments else None,
        }
        appr_insert = admin_db.table("approvals").insert(approval_record).execute()
        if not appr_insert.data:
            raise RuntimeError("Failed to record approval decision")
        created_appr = appr_insert.data[0]

        if clean_decision == "REJECTED":
            admin_db.table("workflow_tasks").update({
                "status": "REJECTED",
                "remarks": payload.comments.strip(),
            }).eq("id", str(payload.workflow_task_id)).execute()

            admin_db.table("bills").update({"status": "REJECTED"}).eq("id", str(bill_id)).execute()

            audit_res = admin_db.table("audit_logs").insert({
                "actor_id": current_user.id,
                "action": "REJECT_BILL",
                "entity_type": "bills",
                "entity_id": str(bill_id),
                "details": {
                    "task_id": str(payload.workflow_task_id),
                    "role": current_user.role.value,
                    "rejection_reason": payload.comments.strip(),
                },
            }).execute()
            if not audit_res.data:
                raise RuntimeError("Failed to create mandatory audit log entry")

        else:  # APPROVED
            admin_db.table("workflow_tasks").update({
                "status": "COMPLETED",
                "remarks": payload.comments.strip() if payload.comments else "Approved",
            }).eq("id", str(payload.workflow_task_id)).execute()

            new_bill_status = stage_config["approved_bill_status"]
            admin_db.table("bills").update({"status": new_bill_status}).eq("id", str(bill_id)).execute()

            # Create next workflow task if not terminal
            next_role = stage_config["next_role"]
            if next_role:
                next_task_insert = admin_db.table("workflow_tasks").insert({
                    "bill_id": str(bill_id),
                    "assigned_role": next_role.value,
                    "status": "PENDING",
                    "remarks": stage_config["next_remarks"],
                }).execute()
                if not next_task_insert.data:
                    raise RuntimeError("Failed to create sequential next workflow task")
                next_task_id = next_task_insert.data[0]["id"]

            audit_res = admin_db.table("audit_logs").insert({
                "actor_id": current_user.id,
                "action": "APPROVE_BILL_STAGE",
                "entity_type": "bills",
                "entity_id": str(bill_id),
                "details": {
                    "task_id": str(payload.workflow_task_id),
                    "role": current_user.role.value,
                    "stage_completed": assigned_role_str,
                    "new_bill_status": new_bill_status,
                },
            }).execute()
            if not audit_res.data:
                raise RuntimeError("Failed to create mandatory audit log entry")

        return ApprovalResponse.model_validate(created_appr)

    except HTTPException:
        raise
    except Exception as exc:
        # Atomic compensating rollback: revert any partial database writes
        if created_appr and "id" in created_appr:
            try:
                admin_db.table("approvals").delete().eq("id", created_appr["id"]).execute()
            except Exception:
                pass
        if next_task_id:
            try:
                admin_db.table("workflow_tasks").delete().eq("id", next_task_id).execute()
            except Exception:
                pass
        try:
            admin_db.table("bills").update({"status": current_bill_status}).eq("id", str(bill_id)).execute()
            admin_db.table("workflow_tasks").update({
                "status": original_task_status,
                "remarks": original_task_remarks,
            }).eq("id", str(payload.workflow_task_id)).execute()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval workflow processing failed: {str(exc)}. State has been rolled back.",
        ) from exc


@router.get(
    "/bills/{bill_id}/workflow",
    response_model=BillWorkflowProgressResponse,
    summary="Get Bill Workflow Progress",
    description="Retrieve the complete approval history, pending tasks, and status for a bill.",
)
def get_bill_workflow_progress(
    bill_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> BillWorkflowProgressResponse:
    client = admin_db if admin_db else db
    bill_resp = client.table("bills").select("*").eq("id", str(bill_id)).execute()
    if not bill_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill with ID '{bill_id}' not found",
        )
    bill_data = bill_resp.data[0]

    # Supplier isolation check
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id or str(bill_data.get("supplier_id")) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: cannot view workflow for another supplier's bill",
            )
    elif current_user.role not in OFFICER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view workflow records",
        )

    tasks_resp = client.table("workflow_tasks").select("*").eq("bill_id", str(bill_id)).order("created_at").execute()
    approvals_resp = client.table("approvals").select("*").eq("bill_id", str(bill_id)).order("created_at").execute()

    tasks = [WorkflowTaskResponse.model_validate(r) for r in tasks_resp.data]
    approvals = [ApprovalResponse.model_validate(r) for r in approvals_resp.data]

    # Identify pending current task
    current_task = next((t for t in tasks if t.status == "PENDING"), None)

    # Extract rejection reason if bill was rejected
    rejection_reason = None
    if bill_data.get("status") == "REJECTED":
        rejection_appr = next((a for a in reversed(approvals) if a.decision == "REJECTED"), None)
        if rejection_appr:
            rejection_reason = rejection_appr.comments

    return BillWorkflowProgressResponse(
        bill_id=bill_data["id"],
        bill_number=bill_data["bill_number"],
        status=bill_data["status"],
        total_amount=bill_data["total_amount"],
        current_task=current_task,
        tasks=tasks,
        approvals=approvals,
        rejection_reason=rejection_reason,
    )
