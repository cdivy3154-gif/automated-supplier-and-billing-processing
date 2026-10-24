from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    """Allowed user roles matching public.user_profiles database constraint."""

    ADMIN = "ADMIN"
    SUPPLIER = "SUPPLIER"
    GODOWN_MANAGER = "GODOWN_MANAGER"
    BRANCH_OFFICER = "BRANCH_OFFICER"
    PRE_AUDITOR = "PRE_AUDITOR"
    GENERAL_MANAGER = "GENERAL_MANAGER"
    FINANCE_OFFICER = "FINANCE_OFFICER"


class UserProfile(BaseModel):
    """User profile record from public.user_profiles."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="UUID of the user (matches auth.uid())")
    full_name: str
    email: str
    role: UserRole
    supplier_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserContext(BaseModel):
    """Authenticated user context passed across request dependencies."""

    id: str
    email: str
    role: UserRole
    supplier_id: Optional[str] = None
    is_active: bool
    full_name: str
    access_token: str
