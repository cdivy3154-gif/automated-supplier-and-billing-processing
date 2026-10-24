from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class SupplyOrderCreate(BaseModel):
    """Schema for creating a new supply order by authorized staff."""

    order_number: Optional[str] = Field(
        default=None,
        description="Optional unique order number. Auto-generated if omitted.",
        examples=["ORD-20261024-001"],
    )
    supplier_id: UUID = Field(description="ID of the authorized supplier")
    godown_id: UUID = Field(description="ID of destination storage godown")
    commodity_name: str = Field(min_length=1, max_length=100, examples=["Wheat"])
    ordered_quantity: Decimal = Field(gt=0, description="Quantity to be supplied (must be positive)")
    unit: str = Field(min_length=1, max_length=20, examples=["kg", "MT", "quintal"])
    agreed_rate: Decimal = Field(ge=0, description="Agreed rate per unit (must be non-negative)")
    order_date: Optional[date] = Field(default=None, description="Date of order; defaults to today")
    status: Optional[str] = Field(default="AUTHORIZED", description="Order status")


class SupplyOrderResponse(BaseModel):
    """Schema representing an existing supply order."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    supplier_id: UUID
    godown_id: UUID
    commodity_name: str
    ordered_quantity: Decimal
    unit: str
    agreed_rate: Decimal
    order_date: date
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
