from unittest.mock import patch
import pytest
from app.main import app


def test_root_health_check(client):
    """Test the root /health endpoint returns HTTP 200 and valid schema."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "environment" in data
    assert "timestamp" in data
    assert "project_name" in data


@pytest.mark.asyncio
async def test_async_root_health_check(async_client):
    """Test the root /health endpoint via async client."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_api_v1_health_check(client):
    """Test the /api/v1/health endpoint returns HTTP 200 and valid schema."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "environment" in data
    assert "timestamp" in data


def test_database_health_check_success(client):
    """Test /api/v1/health/database when database ping succeeds."""
    with patch("app.api.v1.endpoints.health.ping_supabase_database") as mock_ping:
        mock_ping.return_value = (True, "Connection operational", 12.5)
        response = client.get("/api/v1/health/database")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert data["latency_ms"] == 12.5
        assert data["details"] == "Connection operational"


def test_database_health_check_failure(client):
    """Test /api/v1/health/database when database ping fails returns 503."""
    with patch("app.api.v1.endpoints.health.ping_supabase_database") as mock_ping:
        mock_ping.return_value = (False, "Connection timeout to PostgREST", 500.0)
        response = client.get("/api/v1/health/database")
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert data["detail"]["status"] == "error"
        assert data["detail"]["database"] == "disconnected"


def test_root_index_endpoint(client):
    """Test root GET / returns API metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "docs" in data
    assert data["health"] == "/health"
    assert data["api_v1"] == "/api/v1"
