from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Basic health check response schema."""

    status: str = Field(default="ok", examples=["ok"])
    environment: str = Field(default="development", examples=["development"])
    project_name: str = Field(default="Automated Supplier and Billing Processing API")
    timestamp: str = Field(description="ISO 8601 formatted UTC timestamp")


class DatabaseHealthResponse(BaseModel):
    """Database connectivity health check response schema."""

    status: str = Field(examples=["ok"])
    database: str = Field(examples=["connected"])
    latency_ms: Optional[float] = Field(default=None, examples=[15.4])
    details: Optional[str] = Field(default=None, examples=["Supabase PostgreSQL connection operational"])
    timestamp: str = Field(description="ISO 8601 formatted UTC timestamp")
