from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_active_user
from app.schemas.auth import AuthMeResponse
from app.schemas.user import UserContext

router = APIRouter()


@router.get(
    "/me",
    response_model=AuthMeResponse,
    summary="Get Authenticated User Profile",
    description="Returns profile and role information for the currently authenticated user.",
)
def get_auth_me(
    current_user: UserContext = Depends(get_current_active_user),
) -> AuthMeResponse:
    return AuthMeResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        supplier_id=current_user.supplier_id,
        is_active=current_user.is_active,
    )
