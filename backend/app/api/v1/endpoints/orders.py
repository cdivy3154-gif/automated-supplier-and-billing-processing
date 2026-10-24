from datetime import date
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.dependencies.auth import get_current_active_user, require_roles
from app.dependencies.db import get_user_db
from app.schemas.order import SupplyOrderCreate, SupplyOrderResponse
from app.schemas.user import UserContext, UserRole

router = APIRouter()

STAFF_VIEW_ROLES = {
    UserRole.ADMIN,
    UserRole.BRANCH_OFFICER,
    UserRole.GODOWN_MANAGER,
    UserRole.FINANCE_OFFICER,
    UserRole.PRE_AUDITOR,
    UserRole.GENERAL_MANAGER,
}


@router.get(
    "",
    response_model=List[SupplyOrderResponse],
    summary="List Supply Orders",
    description="Retrieve supply orders. Suppliers are strictly isolated to their own orders; staff can filter.",
)
def list_orders(
    supplier_id: Optional[UUID] = Query(default=None, description="Filter by supplier ID"),
    godown_id: Optional[UUID] = Query(default=None, description="Filter by godown ID"),
    order_status: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> List[SupplyOrderResponse]:
    query = db.table("supply_orders").select("*")

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
                detail="Access forbidden: suppliers cannot query other suppliers' orders",
            )
        query = query.eq("supplier_id", str(current_user.supplier_id))
    elif current_user.role in STAFF_VIEW_ROLES:
        if supplier_id:
            query = query.eq("supplier_id", str(supplier_id))
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view supply orders",
        )

    if godown_id:
        query = query.eq("godown_id", str(godown_id))
    if order_status:
        query = query.eq("status", order_status)

    response = query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()
    return [SupplyOrderResponse.model_validate(row) for row in response.data]


@router.get(
    "/{order_id}",
    response_model=SupplyOrderResponse,
    summary="Get Supply Order by ID",
    description="Retrieve details of a specific supply order.",
)
def get_order_by_id(
    order_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> SupplyOrderResponse:
    response = db.table("supply_orders").select("*").eq("id", str(order_id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supply order with ID '{order_id}' not found",
        )

    order_data = response.data[0]

    # Supplier isolation check
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id or str(order_data.get("supplier_id")) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: order belongs to another supplier",
            )
    elif current_user.role not in STAFF_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view supply orders",
        )

    return SupplyOrderResponse.model_validate(order_data)


@router.post(
    "",
    response_model=SupplyOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Supply Order",
    description="Authorized Branch Officers and Admins can create new commodity procurement orders.",
)
def create_supply_order(
    payload: SupplyOrderCreate,
    current_user: UserContext = Depends(require_roles(UserRole.ADMIN, UserRole.BRANCH_OFFICER)),
    db: Client = Depends(get_user_db),
) -> SupplyOrderResponse:
    # 1. Verify supplier exists and is active
    supp_resp = db.table("suppliers").select("id, is_active").eq("id", str(payload.supplier_id)).execute()
    if not supp_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced supplier ID '{payload.supplier_id}' does not exist",
        )
    if not supp_resp.data[0].get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Referenced supplier ID '{payload.supplier_id}' is deactivated",
        )

    # 2. Verify godown exists and is active
    godown_resp = db.table("godowns").select("id, is_active").eq("id", str(payload.godown_id)).execute()
    if not godown_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced godown ID '{payload.godown_id}' does not exist",
        )
    if not godown_resp.data[0].get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Referenced godown ID '{payload.godown_id}' is deactivated",
        )

    # 3. Generate unique order number if not provided
    order_number = payload.order_number
    if not order_number:
        today_str = date.today().strftime("%Y%m%d")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        order_number = f"ORD-{today_str}-{unique_suffix}"

    order_record = {
        "order_number": order_number,
        "supplier_id": str(payload.supplier_id),
        "godown_id": str(payload.godown_id),
        "commodity_name": payload.commodity_name.strip(),
        "ordered_quantity": float(payload.ordered_quantity),
        "unit": payload.unit.strip(),
        "agreed_rate": float(payload.agreed_rate),
        "order_date": (payload.order_date or date.today()).isoformat(),
        "status": (payload.status or "AUTHORIZED").strip().upper(),
    }

    try:
        insert_resp = db.table("supply_orders").insert(order_record).execute()
        if not insert_resp.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record supply order in database",
            )
        return SupplyOrderResponse.model_validate(insert_resp.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "unique" in err_msg.lower() or "uq" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Supply order with number '{order_number}' already exists",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating supply order: {err_msg}",
        ) from exc
