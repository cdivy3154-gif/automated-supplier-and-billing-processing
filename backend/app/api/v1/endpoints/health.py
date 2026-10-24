from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.core.config import settings
from app.schemas.health import DatabaseHealthResponse, HealthResponse
from app.services.supabase import ping_supabase_database

router = APIRouter()


@router.get(
    "",
    response_model=HealthResponse,
    summary="Application Health Check",
    description="Returns the operational status of the FastAPI backend application.",
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        environment=settings.ENVIRONMENT,
        project_name=settings.PROJECT_NAME,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/database",
    response_model=DatabaseHealthResponse,
    summary="Database Connectivity Check",
    description="Checks the reachability and operational status of the Supabase PostgreSQL database.",
)
def get_database_health() -> DatabaseHealthResponse:
    is_healthy, details, latency_ms = ping_supabase_database()
    timestamp = datetime.now(timezone.utc).isoformat()
    
    if not is_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "error",
                "database": "disconnected",
                "details": details,
                "latency_ms": latency_ms,
                "timestamp": timestamp,
            },
        )
    
    return DatabaseHealthResponse(
        status="ok",
        database="connected",
        latency_ms=latency_ms,
        details=details,
        timestamp=timestamp,
    )
