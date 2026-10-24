from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DeliveryCreate(BaseModel):
    """Schema for recording a physical delivery by authorized godown personnel."""

    delivery_number: Optional[str] = Field(
        default=None,
        description="Optional unique delivery number. Auto-generated if omitted.",
        examples=["DEL-20261024-001"],
    )
    supply_order_id: UUID = Field(description="ID of the associated supply order")
    delivered_quantity: Decimal = Field(gt=0, description="Delivered quantity (must be positive)")
    delivery_date: Optional[date] = Field(default=None, description="Date of physical arrival; defaults to today")
    status: Optional[str] = Field(default="DELIVERED", description="Delivery status")


class DeliveryResponse(BaseModel):
    """Schema representing an existing delivery record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    delivery_number: str
    supply_order_id: UUID
    delivered_quantity: Decimal
    delivery_date: date
    verified_by: Optional[UUID] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
