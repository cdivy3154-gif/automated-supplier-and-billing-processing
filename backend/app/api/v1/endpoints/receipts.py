from datetime import date
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.dependencies.auth import get_current_active_user, require_roles
from app.dependencies.db import get_user_db
from app.schemas.receipt import DeliveryReceiptCreate, DeliveryReceiptResponse
from app.schemas.user import UserContext, UserRole

router = APIRouter()

STAFF_VIEW_ROLES = {
    UserRole.ADMIN,
    UserRole.GODOWN_MANAGER,
    UserRole.BRANCH_OFFICER,
    UserRole.FINANCE_OFFICER,
    UserRole.PRE_AUDITOR,
    UserRole.GENERAL_MANAGER,
}


@router.get(
    "",
    response_model=List[DeliveryReceiptResponse],
    summary="List Digital Delivery Receipts",
    description="Retrieve delivery receipts. Suppliers only see receipts for their own deliveries.",
)
def list_receipts(
    delivery_id: Optional[UUID] = Query(default=None, description="Filter by delivery ID"),
    receipt_status: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> List[DeliveryReceiptResponse]:
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supplier account is not linked to any supplier organization",
            )
        if delivery_id:
            # Verify the delivery belongs to the supplier
            deliv_chk = db.table("deliveries").select("supply_order_id").eq("id", str(delivery_id)).execute()
            if not deliv_chk.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
            so_id = deliv_chk.data[0].get("supply_order_id")
            so_chk = db.table("supply_orders").select("supplier_id").eq("id", str(so_id)).execute()
            if not so_chk.data or str(so_chk.data[0].get("supplier_id")) != str(current_user.supplier_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: delivery belongs to another supplier",
                )
    elif current_user.role not in STAFF_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view receipts",
        )

    query = db.table("delivery_receipts").select("*")
    if delivery_id:
        query = query.eq("delivery_id", str(delivery_id))
    if receipt_status:
        query = query.eq("status", receipt_status)

    response = query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()
    return [DeliveryReceiptResponse.model_validate(row) for row in response.data]


@router.get(
    "/{receipt_id}",
    response_model=DeliveryReceiptResponse,
    summary="Get Delivery Receipt by ID",
    description="Retrieve details of a specific digital delivery receipt.",
)
def get_receipt_by_id(
    receipt_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> DeliveryReceiptResponse:
    response = db.table("delivery_receipts").select("*").eq("id", str(receipt_id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery receipt with ID '{receipt_id}' not found",
        )

    receipt_data = response.data[0]

    # Supplier isolation check
    if current_user.role == UserRole.SUPPLIER:
        delivery_id = receipt_data.get("delivery_id")
        deliv_chk = db.table("deliveries").select("supply_order_id").eq("id", str(delivery_id)).execute()
        if not deliv_chk.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
        so_id = deliv_chk.data[0].get("supply_order_id")
        so_chk = db.table("supply_orders").select("supplier_id").eq("id", str(so_id)).execute()
        if not so_chk.data or str(so_chk.data[0].get("supplier_id")) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: receipt belongs to another supplier's delivery",
            )
    elif current_user.role not in STAFF_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view receipts",
        )

    return DeliveryReceiptResponse.model_validate(receipt_data)


@router.post(
    "",
    response_model=DeliveryReceiptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue Digital Delivery Receipt",
    description="Authorized Godown Managers issue digital delivery receipts for verified physical arrivals.",
)
def issue_delivery_receipt(
    payload: DeliveryReceiptCreate,
    current_user: UserContext = Depends(require_roles(UserRole.ADMIN, UserRole.GODOWN_MANAGER)),
    db: Client = Depends(get_user_db),
) -> DeliveryReceiptResponse:
    # 1. Verify delivery exists
    deliv_resp = db.table("deliveries").select("*").eq("id", str(payload.delivery_id)).execute()
    if not deliv_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced delivery ID '{payload.delivery_id}' does not exist",
        )

    deliv_data = deliv_resp.data[0]

    # 2. Verify delivery is verified and eligible
    if not deliv_data.get("verified_by"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot issue receipt for unverified delivery (verified_by is missing)",
        )
    if str(deliv_data.get("status", "")).upper() != "DELIVERED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot issue receipt for delivery with status '{deliv_data.get('status')}' (must be 'DELIVERED')",
        )

    # 3. Check for existing receipt for this delivery
    existing_rcpt = db.table("delivery_receipts").select("id, receipt_number").eq("delivery_id", str(payload.delivery_id)).execute()
    if existing_rcpt.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A digital receipt has already been issued for delivery '{payload.delivery_id}' (Receipt: {existing_rcpt.data[0].get('receipt_number')})",
        )

    # 4. Generate unique receipt number if omitted
    receipt_number = payload.receipt_number
    if not receipt_number:
        today_str = date.today().strftime("%Y%m%d")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        receipt_number = f"RCPT-{today_str}-{unique_suffix}"

    receipt_record = {
        "receipt_number": receipt_number,
        "delivery_id": str(payload.delivery_id),
        "receipt_reference": payload.receipt_reference.strip() if payload.receipt_reference else None,
        # Issued by authenticated user (godown manager)
        "issued_by": current_user.id,
        "status": "ISSUED",
    }

    try:
        insert_resp = db.table("delivery_receipts").insert(receipt_record).execute()
        if not insert_resp.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record delivery receipt in database",
            )
        return DeliveryReceiptResponse.model_validate(insert_resp.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "unique" in err_msg.lower() or "uq" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Receipt with number '{receipt_number}' already exists",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error issuing delivery receipt: {err_msg}",
        ) from exc
