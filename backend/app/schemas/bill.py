from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class BillDeliveryItemCreate(BaseModel):
    """Line item associating a verified delivery with a bill."""

    delivery_id: UUID = Field(description="ID of the eligible delivery to be billed")
    billed_quantity: Decimal = Field(gt=0, description="Quantity being billed (must be positive)")
    rate: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Optional explicit unit rate. If omitted, derived from the supply order's agreed rate.",
    )


class BillCreate(BaseModel):
    """Schema for submitting a new bill against verified deliveries."""

    invoice_number: str = Field(min_length=1, max_length=100, examples=["INV-20261024-001"])
    invoice_date: date = Field(description="Date on the supplier's commercial invoice")
    delivery_items: List[BillDeliveryItemCreate] = Field(
        min_length=1,
        description="List of verified deliveries included in this invoice (at least 1 required)",
    )
    # Note: supplier_id is NOT accepted from client request bodies for suppliers;
    # it is strictly derived from the authenticated user's profile on the server.
    supplier_id: Optional[UUID] = Field(
        default=None,
        description="For administrative creation only; ignored for supplier callers.",
    )


class BillDeliveryItemResponse(BaseModel):
    """Junction record linking a bill to an included delivery."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bill_id: UUID
    delivery_id: UUID
    billed_quantity: Decimal
    rate: Decimal
    amount: Decimal
    created_at: Optional[datetime] = None


class BillResponse(BaseModel):
    """Summary of a submitted bill."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bill_number: str
    supplier_id: UUID
    invoice_number: str
    invoice_date: date
    total_amount: Decimal
    status: str
    submitted_by: Optional[UUID] = None
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BillDetailResponse(BillResponse):
    """Complete bill detail including associated delivery line items."""

    items: List[BillDeliveryItemResponse] = Field(default_factory=list)
