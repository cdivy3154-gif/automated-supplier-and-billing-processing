from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserRole


class TokenPayload(BaseModel):
    """Decoded Supabase JWT claims."""

    sub: str = Field(description="Supabase auth UID")
    email: Optional[str] = None
    role: Optional[str] = None
    app_role: Optional[str] = None
    exp: Optional[int] = None
    iss: Optional[str] = None


class AuthMeResponse(BaseModel):
    """Response returned by /api/v1/auth/me."""

    id: str = Field(description="Unique user ID")
    full_name: str
    email: str
    role: UserRole
    supplier_id: Optional[str] = None
    is_active: bool
