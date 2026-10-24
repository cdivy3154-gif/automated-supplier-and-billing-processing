from datetime import date
from decimal import Decimal
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.dependencies.auth import get_current_active_user, require_roles
from app.dependencies.db import get_user_db
from app.schemas.delivery import DeliveryCreate, DeliveryResponse
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
    response_model=List[DeliveryResponse],
    summary="List Deliveries",
    description="Retrieve deliveries. Suppliers only see deliveries associated with their own supply orders.",
)
def list_deliveries(
    supply_order_id: Optional[UUID] = Query(default=None, description="Filter by supply order ID"),
    delivery_status: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> List[DeliveryResponse]:
    # Supplier isolation check on requested order
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supplier account is not linked to any supplier organization",
            )
        if supply_order_id:
            order_chk = db.table("supply_orders").select("supplier_id").eq("id", str(supply_order_id)).execute()
            if not order_chk.data or str(order_chk.data[0].get("supplier_id")) != str(current_user.supplier_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: supply order belongs to another supplier",
                )
    elif current_user.role not in STAFF_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view deliveries",
        )

    query = db.table("deliveries").select("*")
    if supply_order_id:
        query = query.eq("supply_order_id", str(supply_order_id))
    if delivery_status:
        query = query.eq("status", delivery_status)

    response = query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()
    return [DeliveryResponse.model_validate(row) for row in response.data]


@router.get(
    "/{delivery_id}",
    response_model=DeliveryResponse,
    summary="Get Delivery by ID",
    description="Retrieve specific delivery details.",
)
def get_delivery_by_id(
    delivery_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> DeliveryResponse:
    response = db.table("deliveries").select("*").eq("id", str(delivery_id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery with ID '{delivery_id}' not found",
        )

    delivery_data = response.data[0]

    # Supplier isolation verification
    if current_user.role == UserRole.SUPPLIER:
        order_id = delivery_data.get("supply_order_id")
        order_resp = db.table("supply_orders").select("supplier_id").eq("id", str(order_id)).execute()
        if not order_resp.data or str(order_resp.data[0].get("supplier_id")) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: delivery belongs to another supplier's order",
            )
    elif current_user.role not in STAFF_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view deliveries",
        )

    return DeliveryResponse.model_validate(delivery_data)


@router.post(
    "",
    response_model=DeliveryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Physical Delivery",
    description="Authorized Godown Managers record and verify physical commodity arrivals.",
)
def record_delivery(
    payload: DeliveryCreate,
    current_user: UserContext = Depends(require_roles(UserRole.ADMIN, UserRole.GODOWN_MANAGER)),
    db: Client = Depends(get_user_db),
) -> DeliveryResponse:
    # 1. Verify supply order exists
    order_resp = db.table("supply_orders").select("*").eq("id", str(payload.supply_order_id)).execute()
    if not order_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced supply order ID '{payload.supply_order_id}' not found",
        )

    order_data = order_resp.data[0]
    order_status = str(order_data.get("status", "")).upper()
    if order_status in ("CANCELLED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot record delivery for order with status '{order_status}'",
        )

    # 2. Validate cumulative delivered quantity vs ordered quantity
    ordered_qty = Decimal(str(order_data["ordered_quantity"]))
    existing_delivs = (
        db.table("deliveries")
        .select("delivered_quantity, status")
        .eq("supply_order_id", str(payload.supply_order_id))
        .execute()
    )
    prev_delivered_total = Decimal("0")
    for d in existing_delivs.data:
        if str(d.get("status", "")).upper() not in ("REJECTED", "CANCELLED"):
            prev_delivered_total += Decimal(str(d["delivered_quantity"]))

    new_total = prev_delivered_total + payload.delivered_quantity
    if new_total > ordered_qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Delivered quantity exceeds ordered limit. "
                f"Ordered: {ordered_qty}, Previously Delivered: {prev_delivered_total}, "
                f"Attempted: {payload.delivered_quantity}"
            ),
        )

    # 3. Generate unique delivery number if omitted
    delivery_number = payload.delivery_number
    if not delivery_number:
        today_str = date.today().strftime("%Y%m%d")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        delivery_number = f"DEL-{today_str}-{unique_suffix}"

    delivery_record = {
        "delivery_number": delivery_number,
        "supply_order_id": str(payload.supply_order_id),
        "delivered_quantity": float(payload.delivered_quantity),
        "delivery_date": (payload.delivery_date or date.today()).isoformat(),
        # Verified strictly by authenticated godown personnel (cannot be forged by caller)
        "verified_by": current_user.id,
        "status": (payload.status or "DELIVERED").strip().upper(),
    }

    try:
        insert_resp = db.table("deliveries").insert(delivery_record).execute()
        if not insert_resp.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record delivery in database",
            )
        return DeliveryResponse.model_validate(insert_resp.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "unique" in err_msg.lower() or "uq" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Delivery with number '{delivery_number}' already exists",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error recording delivery: {err_msg}",
        ) from exc
