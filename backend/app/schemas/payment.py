from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PaymentInitiate(BaseModel):
    """Payload to initiate a simulated payment for a finance-cleared bill."""
    bill_id: UUID
    payment_reference: Optional[str] = Field(default=None, description="Optional custom reference; auto-generated if omitted")


class PaymentSimulateStatus(BaseModel):
    """Payload for simulated asynchronous gateway callback (SUCCESS or FAILED)."""
    target_status: str = Field(..., description="Target status: 'SUCCESS' or 'FAILED'")
    reason: Optional[str] = Field(default=None, description="Optional failure reason or gateway note")


class PaymentResponse(BaseModel):
    """Authoritative payment record representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bill_id: UUID
    payment_reference: str
    amount: Decimal
    status: str
    initiated_by: Optional[UUID] = None
    initiated_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
