from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class SupplierResponse(BaseModel):
    """Supplier record schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    supplier_code: str
    supplier_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
