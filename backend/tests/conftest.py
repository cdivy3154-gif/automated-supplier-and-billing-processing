import os
import sys
import time
from typing import Any, Dict, Generator
import httpx
import jwt
import pytest
import pytest_asyncio
from starlette.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.main import app
from app.schemas.user import UserRole

# Fixed secret for test token verification
TEST_JWT_SECRET = "super-secret-test-jwt-key-for-unit-testing-32-chars-min"
settings.SUPABASE_JWT_SECRET = TEST_JWT_SECRET


@pytest.fixture
def test_app():
    """FastAPI application instance."""
    return app


@pytest.fixture
def client(test_app) -> Generator[TestClient, None, None]:
    """Synchronous test client."""
    with TestClient(test_app) as c:
        yield c


@pytest_asyncio.fixture(loop_scope="function")
async def async_client(test_app):
    """Asynchronous test client using httpx ASGITransport."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as ac:
        yield ac


def create_test_token(
    user_id: str,
    email: str,
    expires_in: int = 3600,
    secret: str = TEST_JWT_SECRET,
) -> str:
    """Generate a signed JWT token for testing."""
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + expires_in,
        "iss": "supabase",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def admin_user_data() -> Dict[str, Any]:
    return {
        "id": "a0000000-0000-0000-0000-000000000001",
        "full_name": "System Administrator",
        "email": "admin@statecommodities.gov",
        "role": UserRole.ADMIN.value,
        "supplier_id": None,
        "is_active": True,
    }


@pytest.fixture
def admin_token(admin_user_data) -> str:
    return create_test_token(
        user_id=admin_user_data["id"],
        email=admin_user_data["email"],
    )


@pytest.fixture
def supplier_user_data() -> Dict[str, Any]:
    return {
        "id": "b0000000-0000-0000-0000-000000000002",
        "full_name": "Agro Commodity Supplies Pvt Ltd",
        "email": "contact@agrocommodity.com",
        "role": UserRole.SUPPLIER.value,
        "supplier_id": "c0000000-0000-0000-0000-000000000003",
        "is_active": True,
    }


@pytest.fixture
def supplier_token(supplier_user_data) -> str:
    return create_test_token(
        user_id=supplier_user_data["id"],
        email=supplier_user_data["email"],
    )


@pytest.fixture
def inactive_user_data() -> Dict[str, Any]:
    return {
        "id": "e0000000-0000-0000-0000-000000000005",
        "full_name": "Deactivated User",
        "email": "deactivated@example.com",
        "role": UserRole.SUPPLIER.value,
        "supplier_id": None,
        "is_active": False,
    }


@pytest.fixture
def inactive_user_token(inactive_user_data) -> str:
    return create_test_token(
        user_id=inactive_user_data["id"],
        email=inactive_user_data["email"],
    )


class MockPostgrestResponse:
    def __init__(self, data):
        self.data = data


class MockTableQuery:
    def __init__(self, db_records):
        self._records = db_records
        self._filters = {}

    def select(self, *columns):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def limit(self, count):
        return self

    def execute(self):
        matching = []
        for r in self._records:
            match = True
            for k, v in self._filters.items():
                if str(r.get(k)) != str(v):
                    match = False
                    break
            if match:
                matching.append(r)
        return MockPostgrestResponse(matching)


class MockSupabaseClient:
    def __init__(self, records):
        self._records = records
        self.postgrest = self

    def auth(self, token):
        self._token = token
        return self

    def table(self, table_name):
        return MockTableQuery(self._records.get(table_name, []))
