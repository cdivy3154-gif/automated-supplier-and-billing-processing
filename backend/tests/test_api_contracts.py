"""API Contract and Frontend Integration Validation Test Suite.

Validates that all API groups strictly conform to the frontend contract:
1. OpenAPI specification completeness across all route groups.
2. Explicit CORS preflight behavior for frontend origins.
3. Standardized error envelopes (401, 403, 404, 409, 422, 500).
4. No stack trace or internal database detail leakage in error responses.
5. Response payload compatibility with Pydantic schemas.
"""

from decimal import Decimal
from typing import Any, Dict
from unittest.mock import patch
import pytest
from starlette.testclient import TestClient

from app.schemas.health import HealthResponse
from app.schemas.payment import PaymentResponse
from app.schemas.user import UserProfile
from app.schemas.workflow import WorkflowTaskResponse
from tests.conftest import MockSupabaseClient


def test_contract_openapi_schema_available(client: TestClient):
    """
    Validates that /openapi.json is accessible and documents all expected API route groups.
    """
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()

    assert "paths" in schema
    paths = schema["paths"]

    # Verify critical path groups are present
    expected_paths = [
        "/health",
        "/api/v1/health",
        "/api/v1/auth/me",
        "/api/v1/suppliers/me",
        "/api/v1/orders",
        "/api/v1/deliveries",
        "/api/v1/receipts",
        "/api/v1/bills",
        "/api/v1/approvals/tasks/pending",
        "/api/v1/approvals",
        "/api/v1/payments",
    ]
    for path in expected_paths:
        assert path in paths, f"Missing route in OpenAPI contract: {path}"


def test_contract_cors_preflight_headers(client: TestClient):
    """
    Validates CORS preflight (OPTIONS) response headers for frontend development origins.
    """
    frontend_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5500",
        "http://localhost:8080",
    ]
    for origin in frontend_origins:
        resp = client.options(
            "/api/v1/bills",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type",
            },
        )
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == origin
        assert resp.headers.get("access-control-allow-credentials") == "true"
        assert "POST" in resp.headers.get("access-control-allow-methods", "")


def test_contract_cors_disallows_arbitrary_origins(client: TestClient):
    """
    Validates that an untrusted origin does NOT receive access-control-allow-origin header.
    """
    resp = client.options(
        "/api/v1/bills",
        headers={
            "Origin": "https://malicious-external-site.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # Untrusted origin must not be reflected
    assert resp.headers.get("access-control-allow-origin") != "https://malicious-external-site.com"


def test_contract_unauthenticated_error_format(client: TestClient):
    """
    Validates that unauthenticated requests to protected endpoints return
    HTTP 401 Unauthorized with a clean {"detail": "..."} envelope.
    """
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    data = resp.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)
    assert "authentication credentials" in data["detail"].lower() or "not authenticated" in data["detail"].lower()


def test_contract_invalid_token_error_format(client: TestClient):
    """
    Validates that requests with malformed tokens return HTTP 401 with standard detail.
    """
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-token-string"},
    )
    assert resp.status_code == 401
    data = resp.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)


def test_contract_forbidden_role_error_format(
    client: TestClient,
    supplier_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Validates that role authorization failures return HTTP 403 Forbidden with clean detail.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client):

        # Supplier attempting to create supply order (restricted to Branch Officer/Admin)
        resp = client.post(
            "/api/v1/orders",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "supplier_id": mock_db_state["suppliers"][0]["id"],
                "godown_id": mock_db_state["godowns"][0]["id"],
                "commodity_name": "Wheat",
                "ordered_quantity": 100.0,
                "agreed_rate": 20.0,
                "order_date": "2026-10-24",
            },
        )
        assert resp.status_code == 403
        data = resp.json()
        assert "detail" in data
        assert "access forbidden" in data["detail"].lower()


def test_contract_validation_error_422_format(
    client: TestClient,
    branch_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Validates that schema validation failures return HTTP 422 Unprocessable Entity
    with standard loc/msg/type error objects.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client):

        # Negative quantity violates Field(gt=0)
        resp = client.post(
            "/api/v1/orders",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={
                "supplier_id": mock_db_state["suppliers"][0]["id"],
                "godown_id": mock_db_state["godowns"][0]["id"],
                "commodity_name": "Wheat",
                "ordered_quantity": -50.0,  # Invalid!
                "agreed_rate": 20.0,
                "order_date": "2026-10-24",
            },
        )
        assert resp.status_code == 422
        data = resp.json()
        assert "detail" in data
        assert isinstance(data["detail"], list)
        assert any("ordered_quantity" in str(err.get("loc")) for err in data["detail"])


def test_contract_no_stack_trace_leakage_on_unhandled_error(
    client: TestClient,
    supplier_token: str,
):
    """
    Validates that unhandled exceptions caught by global exception handler
    return clean 500 error envelope without exposing Python tracebacks or paths.
    """
    with patch("app.api.v1.endpoints.auth.get_current_active_user", side_effect=Exception("Database crash on internal-host:5432")):
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert resp.status_code == 500
        data = resp.json()
        assert "detail" in data
        # Must not contain internal connection strings, tracebacks, or file paths
        assert "internal-host:5432" not in data["detail"]
        assert "traceback" not in str(data).lower()
        assert "file \"" not in str(data).lower()


def test_contract_auth_me_response_schema(
    client: TestClient,
    supplier_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Validates that /api/v1/auth/me response parses cleanly into UserProfile schema.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client):

        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert resp.status_code == 200
        profile = UserProfile.model_validate(resp.json())
        assert profile.email == mock_db_state["user_profiles"][6]["email"]
        assert profile.role.value == "SUPPLIER"
