from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate required configuration and initialize application resources."""
    settings.validate_production_readiness()
    yield


def create_application() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="Backend API for Automated State Commodity Supplier Billing and Payment Processing",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global unhandled exception handler to prevent leaking internal stack traces or database info
    @app.exception_handler(Exception)
    async def global_unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred. Please contact the administrator."},
        )

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Root health check endpoint for load balancers and orchestrators
    @app.get(
        "/health",
        response_model=HealthResponse,
        tags=["Health"],
        summary="Root Health Check",
    )
    def root_health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            environment=settings.ENVIRONMENT,
            project_name=settings.PROJECT_NAME,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    # Root index endpoint
    @app.get(
        "/",
        tags=["Root"],
        summary="Root Status",
    )
    def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "docs": "/docs",
            "health": "/health",
            "api_v1": settings.API_V1_STR,
        }

    return app


app = create_application()
