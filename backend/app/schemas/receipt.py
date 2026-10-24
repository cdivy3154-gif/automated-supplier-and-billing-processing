from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DeliveryReceiptCreate(BaseModel):
    """Schema for issuing a digital delivery receipt for a verified delivery."""

    delivery_id: UUID = Field(description="ID of the verified delivery")
    receipt_reference: Optional[str] = Field(
        default=None,
        description="Optional external physical docket or weighbridge reference",
        examples=["WB-99482"],
    )
    receipt_number: Optional[str] = Field(
        default=None,
        description="Optional custom receipt number. Auto-generated if omitted.",
        examples=["RCPT-20261024-001"],
    )


class DeliveryReceiptResponse(BaseModel):
    """Schema representing an issued digital delivery receipt."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    receipt_number: str
    delivery_id: UUID
    receipt_reference: Optional[str] = None
    issued_by: Optional[UUID] = None
    issued_at: Optional[datetime] = None
    status: str
    created_at: Optional[datetime] = None
