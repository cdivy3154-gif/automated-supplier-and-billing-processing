import pytest
from jwt.exceptions import InvalidTokenError
from app.core.config import Settings
from app.core.security import decode_access_token


def test_settings_defaults():
    """Verify default values in Settings."""
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_ANON_KEY="anon-key",
    )
    assert settings.PROJECT_NAME == "Automated Supplier and Billing Processing API"
    assert settings.ENVIRONMENT == "development"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.is_production is False


def test_settings_cors_origins_comma_separated():
    """Verify CORS origins string is parsed into list."""
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_ANON_KEY="anon-key",
        ALLOWED_ORIGINS="http://localhost:3000, https://app.example.com,http://127.0.0.1:8000 ",
    )
    assert settings.ALLOWED_ORIGINS == [
        "http://localhost:3000",
        "https://app.example.com",
        "http://127.0.0.1:8000",
    ]


def test_settings_cors_origins_json_list():
    """Verify CORS origins JSON string is parsed into list."""
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_ANON_KEY="anon-key",
        ALLOWED_ORIGINS='["http://localhost:5173", "https://prod.domain.org"]',
    )
    assert settings.ALLOWED_ORIGINS == [
        "http://localhost:5173",
        "https://prod.domain.org",
    ]


def test_settings_is_production_flag():
    """Verify is_production property responds to ENVIRONMENT value."""
    prod_settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_ANON_KEY="anon-key",
        ENVIRONMENT="production",
    )
    assert prod_settings.is_production is True

    dev_settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_ANON_KEY="anon-key",
        ENVIRONMENT="development",
    )
    assert dev_settings.is_production is False


def test_decode_access_token_empty_token():
    """decode_access_token should raise InvalidTokenError on empty token."""
    with pytest.raises(InvalidTokenError):
        decode_access_token("")
    with pytest.raises(InvalidTokenError):
        decode_access_token(None)  # type: ignore


def test_validate_production_readiness_fails_on_placeholder():
    """Verify that placeholder config raises ValueError in production."""
    prod_placeholder = Settings(
        SUPABASE_URL="https://placeholder.supabase.co",
        SUPABASE_ANON_KEY="placeholder-anon-key",
        ENVIRONMENT="production",
    )
    with pytest.raises(ValueError, match="SUPABASE_URL must be configured"):
        prod_placeholder.validate_production_readiness()


def test_validate_production_readiness_succeeds_on_valid_config():
    """Verify that valid config passes validation in production."""
    prod_valid = Settings(
        SUPABASE_URL="https://real-project.supabase.co",
        SUPABASE_ANON_KEY="real-anon-key-12345",
        SUPABASE_SERVICE_ROLE_KEY="real-service-key-12345",
        ENVIRONMENT="production",
    )
    # Should not raise
    prod_valid.validate_production_readiness()


def test_validate_production_readiness_skipped_in_dev():
    """Verify that development mode allows placeholder configs without raising."""
    dev_settings = Settings(
        SUPABASE_URL="https://placeholder.supabase.co",
        SUPABASE_ANON_KEY="placeholder-anon-key",
        ENVIRONMENT="development",
    )
    dev_settings.validate_production_readiness()

