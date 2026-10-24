from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.dependencies.auth import get_current_active_user, require_roles
from app.dependencies.db import get_admin_db, get_user_db
from app.schemas.bill import (
    BillCreate,
    BillDeliveryItemResponse,
    BillDetailResponse,
    BillResponse,
)
from app.schemas.user import UserContext, UserRole

router = APIRouter()

STAFF_VIEW_ROLES = {
    UserRole.ADMIN,
    UserRole.FINANCE_OFFICER,
    UserRole.PRE_AUDITOR,
    UserRole.GENERAL_MANAGER,
    UserRole.BRANCH_OFFICER,
}


@router.get(
    "",
    response_model=List[BillResponse],
    summary="List Bills",
    description="Retrieve submitted bills. Suppliers only see their own bills; staff can filter.",
)
def list_bills(
    supplier_id: Optional[UUID] = Query(default=None, description="Filter by supplier ID"),
    bill_status: Optional[str] = Query(default=None, alias="status", description="Filter by bill status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> List[BillResponse]:
    # Supplier isolation enforcement
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supplier account is not linked to any supplier organization",
            )
        if supplier_id and str(supplier_id) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: suppliers cannot query other suppliers' bills",
            )
        query = db.table("bills").select("*").eq("supplier_id", str(current_user.supplier_id))
    elif current_user.role in STAFF_VIEW_ROLES:
        query = db.table("bills").select("*")
        if supplier_id:
            query = query.eq("supplier_id", str(supplier_id))
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view bills",
        )

    if bill_status:
        query = query.eq("status", bill_status)

    response = query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()
    return [BillResponse.model_validate(row) for row in response.data]


@router.get(
    "/{bill_id}",
    response_model=BillDetailResponse,
    summary="Get Bill by ID",
    description="Retrieve full bill details along with associated delivery line items.",
)
def get_bill_by_id(
    bill_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> BillDetailResponse:
    bill_resp = db.table("bills").select("*").eq("id", str(bill_id)).execute()
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
                detail="Access forbidden: bill belongs to another supplier",
            )
    elif current_user.role not in STAFF_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view bills",
        )

    # Fetch associated bill_deliveries
    items_resp = db.table("bill_deliveries").select("*").eq("bill_id", str(bill_id)).execute()
    items = [BillDeliveryItemResponse.model_validate(row) for row in items_resp.data]

    detail = BillDetailResponse.model_validate(bill_data)
    detail.items = items
    return detail


@router.post(
    "",
    response_model=BillDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit New Bill",
    description="Suppliers submit commercial invoices for verified commodity deliveries. Quantities and totals are verified and calculated on the server.",
)
def submit_bill(
    payload: BillCreate,
    current_user: UserContext = Depends(
        require_roles(UserRole.SUPPLIER, UserRole.ADMIN, UserRole.FINANCE_OFFICER)
    ),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> BillDetailResponse:
    # 1. Derive supplier identity strictly on server; NEVER trust client-supplied ID for suppliers
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supplier account is not linked to any supplier organization",
            )
        effective_supplier_id = str(current_user.supplier_id)
    else:
        # Admin / Finance officer
        if not payload.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="supplier_id is required for administrative bill submission",
            )
        effective_supplier_id = str(payload.supplier_id)

    # 2. Attempt atomic submission via PostgreSQL RPC (submit_bill_atomic)
    # This executes bill creation, delivery association, and workflow task creation in a single ACID transaction.
    rpc_payload = {
        "p_invoice_number": payload.invoice_number.strip(),
        "p_invoice_date": payload.invoice_date.isoformat(),
        "p_delivery_items": [
            {
                "delivery_id": str(item.delivery_id),
                "billed_quantity": float(item.billed_quantity),
                **({"rate": float(item.rate)} if item.rate is not None else {}),
            }
            for item in payload.delivery_items
        ],
        "p_supplier_id": effective_supplier_id if current_user.role != UserRole.SUPPLIER else None,
        "p_submitted_by": current_user.id,
    }

    try:
        rpc_resp = db.rpc("submit_bill_atomic", rpc_payload).execute()
        if rpc_resp.data:
            return BillDetailResponse.model_validate(rpc_resp.data)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Atomic bill submission RPC returned empty response",
        )
    except HTTPException:
        raise
    except Exception as rpc_exc:
        err_str = str(rpc_exc).lower()
        # Fall back to multi-step execution ONLY if the RPC function is not installed in the schema (e.g. pending migration)
        is_missing_rpc = (
            "pgrst202" in err_str
            or "could not find the function" in err_str
            or ("function public.submit_bill_atomic" in err_str and "does not exist" in err_str)
            or ("submit_bill_atomic" in err_str and "not found" in err_str)
        )
        if is_missing_rpc:
            pass  # Fallback to multi-step flow
        elif "unique" in err_str or "uq" in err_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invoice '{payload.invoice_number.strip()}' has already been submitted for this supplier",
            ) from rpc_exc
        elif "already billed" in err_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Delivery association conflict: {str(rpc_exc)}",
            ) from rpc_exc
        elif "insufficient_privilege" in err_str or "not authorized" in err_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: {str(rpc_exc)}",
            ) from rpc_exc
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error submitting bill: {str(rpc_exc)}",
            ) from rpc_exc

    # 3. Pre-validate submission data for application-level checks
    # 3a. Check for duplicate invoice number for this supplier
    inv_check = (
        db.table("bills")
        .select("id")
        .eq("supplier_id", effective_supplier_id)
        .eq("invoice_number", payload.invoice_number.strip())
        .execute()
    )
    if inv_check.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice '{payload.invoice_number.strip()}' has already been submitted for this supplier",
        )

    # 3b. Validate delivery items (no duplicates in payload)
    requested_delivery_ids = [str(item.delivery_id) for item in payload.delivery_items]
    if len(requested_delivery_ids) != len(set(requested_delivery_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate delivery references found in submission payload",
        )

    # 3c. Validate each delivery association and calculate totals with Decimal arithmetic
    server_calculated_total = Decimal("0.00")
    prepared_items = []

    for item in payload.delivery_items:
        deliv_id_str = str(item.delivery_id)

        deliv_resp = db.table("deliveries").select("*").eq("id", deliv_id_str).execute()
        if not deliv_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced delivery ID '{deliv_id_str}' does not exist",
            )
        deliv_data = deliv_resp.data[0]

        if str(deliv_data.get("status", "")).upper() != "DELIVERED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Delivery '{deliv_id_str}' has ineligible status '{deliv_data.get('status')}' (must be 'DELIVERED')",
            )

        order_resp = (
            db.table("supply_orders")
            .select("supplier_id, agreed_rate, status")
            .eq("id", str(deliv_data["supply_order_id"]))
            .execute()
        )
        if not order_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent supply order for delivery '{deliv_id_str}' not found",
            )
        order_data = order_resp.data[0]

        if str(order_data.get("supplier_id")) != effective_supplier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: delivery '{deliv_id_str}' does not belong to the authenticated supplier",
            )

        receipt_resp = (
            db.table("delivery_receipts")
            .select("id, status")
            .eq("delivery_id", deliv_id_str)
            .execute()
        )
        if not receipt_resp.data or str(receipt_resp.data[0].get("status", "")).upper() != "ISSUED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Delivery '{deliv_id_str}' does not have an issued delivery receipt and cannot be billed",
            )

        existing_bill_deliv = (
            db.table("bill_deliveries")
            .select("bill_id")
            .eq("delivery_id", deliv_id_str)
            .execute()
        )
        if existing_bill_deliv.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Delivery '{deliv_id_str}' has already been billed under bill '{existing_bill_deliv.data[0]['bill_id']}'",
            )

        delivered_qty = Decimal(str(deliv_data["delivered_quantity"]))
        billed_qty = item.billed_quantity
        if billed_qty > delivered_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Billed quantity ({billed_qty}) exceeds delivered quantity ({delivered_qty}) "
                    f"for delivery '{deliv_id_str}'"
                ),
            )

        agreed_rate = Decimal(str(order_data["agreed_rate"]))
        unit_rate = item.rate if item.rate is not None else agreed_rate
        if unit_rate > agreed_rate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Billed rate ({unit_rate}) exceeds agreed contract rate ({agreed_rate}) for delivery '{deliv_id_str}'",
            )

        line_amount = (billed_qty * unit_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        server_calculated_total += line_amount

        prepared_items.append({
            "delivery_id": deliv_id_str,
            "billed_quantity": float(billed_qty),
            "rate": float(unit_rate),
            "amount": float(line_amount),
        })

    # 4. Fallback execution requires admin_db for workflow task and compensating rollback
    if not admin_db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database administration service is required for bill workflow task creation",
        )

    # 5. Generate unique bill number
    today_str = date.today().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    bill_number = f"BILL-{today_str}-{unique_suffix}"

    bill_record = {
        "bill_number": bill_number,
        "supplier_id": effective_supplier_id,
        "invoice_number": payload.invoice_number.strip(),
        "invoice_date": payload.invoice_date.isoformat(),
        "total_amount": float(server_calculated_total),
        "status": "SUBMITTED",
        "submitted_by": current_user.id,
    }

    # 5. Insert bill, deliveries, and workflow task atomically
    bill_id = None
    try:
        bill_insert = db.table("bills").insert(bill_record).execute()
        if not bill_insert.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record bill header in database",
            )
        created_bill = bill_insert.data[0]
        bill_id = created_bill["id"]

        for item_dict in prepared_items:
            item_dict["bill_id"] = bill_id

        deliv_insert = db.table("bill_deliveries").insert(prepared_items).execute()
        if not deliv_insert.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record bill delivery associations",
            )

        # 6. Create initial workflow task via admin_db (MANDATORY: cannot be swallowed!)
        workflow_task_record = {
            "bill_id": bill_id,
            "assigned_role": "BRANCH_OFFICER",
            "status": "PENDING",
            "remarks": "Initial bill submission awaiting branch officer review",
        }
        try:
            task_insert = admin_db.table("workflow_tasks").insert(workflow_task_record).execute()
            if not task_insert.data:
                raise RuntimeError("Workflow task insert returned empty response")
        except Exception as task_exc:
            # Atomic compensating rollback: remove bill_deliveries and bill via admin_db
            try:
                admin_db.table("bill_deliveries").delete().eq("bill_id", bill_id).execute()
                admin_db.table("bills").delete().eq("id", bill_id).execute()
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create mandatory initial workflow task: {str(task_exc)}. Bill submission rolled back.",
            ) from task_exc

        result_detail = BillDetailResponse.model_validate(created_bill)
        result_detail.items = [BillDeliveryItemResponse.model_validate(row) for row in deliv_insert.data]
        return result_detail

    except HTTPException:
        # Rollback via admin_db to bypass RLS restrictions that block supplier DELETE
        if bill_id and admin_db:
            try:
                admin_db.table("bill_deliveries").delete().eq("bill_id", bill_id).execute()
                admin_db.table("bills").delete().eq("id", bill_id).execute()
            except Exception:
                pass
        raise
    except Exception as exc:
        if bill_id and admin_db:
            try:
                admin_db.table("bill_deliveries").delete().eq("bill_id", bill_id).execute()
                admin_db.table("bills").delete().eq("id", bill_id).execute()
            except Exception:
                pass
        err_msg = str(exc)
        if "unique" in err_msg.lower() or "uq" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Duplicate record detected during bill submission",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error submitting bill: {err_msg}",
        ) from exc
