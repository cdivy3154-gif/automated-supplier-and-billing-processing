from typing import Callable, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.security import decode_access_token
from app.schemas.user import UserContext, UserProfile, UserRole
from app.services.supabase import get_supabase_user_client

http_bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="BearerAuth",
    description="Supabase Auth JWT Bearer Token",
)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
) -> UserContext:
    """
    Extract, decode, and cryptographically validate the Supabase JWT Bearer token,
    and fetch the corresponding user profile from public.user_profiles under RLS.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Decode and cryptographically validate JWT signature and claims
    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Enforce that anonymous tokens cannot masquerade as authenticated user sessions
    if payload.get("aud") == "anon" or payload.get("role") == "anon":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Anonymous tokens cannot be used to authenticate user sessions",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject identifier (sub)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user profile using user-authenticated client to respect RLS
    try:
        user_client = get_supabase_user_client(token)
        response = user_client.table("user_profiles").select("*").eq("id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User profile not found for user ID: {user_id}",
            )
        
        profile_data = response.data[0]
        role_value = profile_data.get("role")
        try:
            validated_role = UserRole(role_value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{role_value}' assigned to user profile",
            ) from exc

        return UserContext(
            id=str(profile_data["id"]),
            email=profile_data["email"],
            role=validated_role,
            supplier_id=str(profile_data["supplier_id"]) if profile_data.get("supplier_id") else None,
            is_active=bool(profile_data.get("is_active", True)),
            full_name=profile_data.get("full_name", ""),
            access_token=token,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user profile: {str(exc)}",
        ) from exc


async def get_current_active_user(
    current_user: UserContext = Depends(get_current_user),
) -> UserContext:
    """Verify that the authenticated user profile is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return current_user


def require_roles(*allowed_roles: UserRole) -> Callable[..., UserContext]:
    """
    Dependency factory that verifies the authenticated user possesses one of the allowed roles.
    """
    allowed_role_set = set(allowed_roles)

    async def role_checker(
        current_user: UserContext = Depends(get_current_active_user),
    ) -> UserContext:
        if current_user.role not in allowed_role_set:
            role_names = [r.value for r in allowed_role_set]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: required role in {role_names}, but user has role '{current_user.role.value}'",
            )
        return current_user

    return role_checker
