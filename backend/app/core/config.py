import json
import os
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration and settings."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Automated Supplier and Billing Processing API"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Supabase Configuration
    SUPABASE_URL: str = Field(
        default="https://placeholder.supabase.co",
        description="Supabase project URL",
    )
    SUPABASE_ANON_KEY: str = Field(
        default="placeholder-anon-key",
        description="Supabase anonymous public key",
    )
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(
        default=None,
        description="Restricted Supabase service role key (trusted server-side operations only)",
    )
    SUPABASE_JWT_SECRET: Optional[str] = Field(
        default=None,
        description="Supabase JWT secret for cryptographic HS256 verification (used in test/local environments)",
    )
    SUPABASE_JWKS_URL: Optional[str] = Field(
        default=None,
        description="Supabase JWKS URL for cryptographic ES256/RS256 asymmetric token verification",
    )

    # CORS Settings - Explicit permitted origins for local development
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5500",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8080",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [origin.strip() for origin in v_stripped.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return []

    @property
    def jwks_url(self) -> str:
        """Derive the JWKS URL for Supabase Auth asymmetric public keys."""
        if self.SUPABASE_JWKS_URL:
            return self.SUPABASE_JWKS_URL
        base = self.SUPABASE_URL.rstrip("/")
        return f"{base}/auth/v1/.well-known/jwks.json"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    def validate_production_readiness(self) -> None:
        """Validate that required production secrets and URLs are present and not placeholders."""
        if not self.is_production:
            return
        if not self.SUPABASE_URL or "placeholder" in self.SUPABASE_URL.lower():
            raise ValueError("SUPABASE_URL must be configured with a valid Supabase project URL in production")
        if not self.SUPABASE_ANON_KEY or "placeholder" in self.SUPABASE_ANON_KEY.lower():
            raise ValueError("SUPABASE_ANON_KEY must be configured with a valid anonymous key in production")
        if not self.SUPABASE_SERVICE_ROLE_KEY or "placeholder" in self.SUPABASE_SERVICE_ROLE_KEY.lower():
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required for server operations in production")


settings = Settings()
