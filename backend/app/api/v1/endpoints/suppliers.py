from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_user_db
from app.schemas.supplier import SupplierResponse
from app.schemas.user import UserContext, UserRole

router = APIRouter()

STAFF_ROLES = {
    UserRole.ADMIN,
    UserRole.BRANCH_OFFICER,
    UserRole.GODOWN_MANAGER,
    UserRole.FINANCE_OFFICER,
    UserRole.PRE_AUDITOR,
    UserRole.GENERAL_MANAGER,
}


@router.get(
    "/me",
    response_model=SupplierResponse,
    summary="Get Current Authenticated Supplier Profile",
    description="Returns the supplier profile linked to the authenticated user.",
)
def get_current_supplier(
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> SupplierResponse:
    if not current_user.supplier_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No supplier organization linked to this authenticated account",
        )

    response = db.table("suppliers").select("*").eq("id", current_user.supplier_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked supplier organization not found",
        )

    return SupplierResponse.model_validate(response.data[0])


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Get Supplier by ID",
    description="Retrieve supplier information. Suppliers may only retrieve their own record; authorized staff can view any.",
)
def get_supplier_by_id(
    supplier_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
) -> SupplierResponse:
    # Supplier isolation check
    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id or str(supplier_id) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: suppliers cannot access other suppliers' information",
            )
    elif current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' is not authorized to view supplier records",
        )

    response = db.table("suppliers").select("*").eq("id", str(supplier_id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with ID '{supplier_id}' not found",
        )

    return SupplierResponse.model_validate(response.data[0])
