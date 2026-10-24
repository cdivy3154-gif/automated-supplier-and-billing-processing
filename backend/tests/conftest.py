import os
import sys
import time
from typing import Any, Dict, Generator
import uuid
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


# ============================================================================
# User Profile Fixtures
# ============================================================================

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
def branch_officer_user_data() -> Dict[str, Any]:
    return {
        "id": "a0000000-0000-0000-0000-000000000010",
        "full_name": "Branch Procurement Officer",
        "email": "branch@statecommodities.gov",
        "role": UserRole.BRANCH_OFFICER.value,
        "supplier_id": None,
        "is_active": True,
    }


@pytest.fixture
def branch_officer_token(branch_officer_user_data) -> str:
    return create_test_token(
        user_id=branch_officer_user_data["id"],
        email=branch_officer_user_data["email"],
    )


@pytest.fixture
def godown_manager_user_data() -> Dict[str, Any]:
    return {
        "id": "a0000000-0000-0000-0000-000000000020",
        "full_name": "Central Godown Manager",
        "email": "godownmgr@statecommodities.gov",
        "role": UserRole.GODOWN_MANAGER.value,
        "supplier_id": None,
        "is_active": True,
    }


@pytest.fixture
def godown_manager_token(godown_manager_user_data) -> str:
    return create_test_token(
        user_id=godown_manager_user_data["id"],
        email=godown_manager_user_data["email"],
    )


@pytest.fixture
def finance_officer_user_data() -> Dict[str, Any]:
    return {
        "id": "a0000000-0000-0000-0000-000000000030",
        "full_name": "Finance Review Officer",
        "email": "finance@statecommodities.gov",
        "role": UserRole.FINANCE_OFFICER.value,
        "supplier_id": None,
        "is_active": True,
    }


@pytest.fixture
def finance_officer_token(finance_officer_user_data) -> str:
    return create_test_token(
        user_id=finance_officer_user_data["id"],
        email=finance_officer_user_data["email"],
    )


@pytest.fixture
def pre_auditor_user_data() -> Dict[str, Any]:
    return {
        "id": "a0000000-0000-0000-0000-000000000040",
        "full_name": "Senior Pre-Auditor",
        "email": "preaudit@statecommodities.gov",
        "role": UserRole.PRE_AUDITOR.value,
        "supplier_id": None,
        "is_active": True,
    }


@pytest.fixture
def pre_auditor_token(pre_auditor_user_data) -> str:
    return create_test_token(
        user_id=pre_auditor_user_data["id"],
        email=pre_auditor_user_data["email"],
    )


@pytest.fixture
def general_manager_user_data() -> Dict[str, Any]:
    return {
        "id": "a0000000-0000-0000-0000-000000000050",
        "full_name": "General Manager Procurement",
        "email": "gm@statecommodities.gov",
        "role": UserRole.GENERAL_MANAGER.value,
        "supplier_id": None,
        "is_active": True,
    }


@pytest.fixture
def general_manager_token(general_manager_user_data) -> str:
    return create_test_token(
        user_id=general_manager_user_data["id"],
        email=general_manager_user_data["email"],
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
def supplier2_user_data() -> Dict[str, Any]:
    return {
        "id": "b0000000-0000-0000-0000-000000000004",
        "full_name": "Beta Grains Corporation",
        "email": "info@betagrains.com",
        "role": UserRole.SUPPLIER.value,
        "supplier_id": "c0000000-0000-0000-0000-000000000005",
        "is_active": True,
    }


@pytest.fixture
def supplier2_token(supplier2_user_data) -> str:
    return create_test_token(
        user_id=supplier2_user_data["id"],
        email=supplier2_user_data["email"],
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


# ============================================================================
# Mock PostgREST Client
# ============================================================================

class MockPostgrestResponse:
    def __init__(self, data):
        self.data = data


class MockTableQuery:
    def __init__(self, db_records):
        self._records = db_records
        self._filters = {}
        self._op = "select"
        self._insert_data = None
        self._update_data = None
        self._range_slice = None

    def select(self, *columns):
        self._op = "select"
        return self

    def insert(self, data):
        self._op = "insert"
        self._insert_data = data
        return self

    def update(self, data):
        self._op = "update"
        self._update_data = data
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, column, value):
        self._filters[column] = str(value)
        return self

    def range(self, start, end):
        self._range_slice = (start, end)
        return self

    def order(self, column, desc=False):
        return self

    def limit(self, count):
        self._limit = count
        return self

    def execute(self):
        if self._op == "insert":
            items = self._insert_data if isinstance(self._insert_data, list) else [self._insert_data]
            inserted = []
            for item in items:
                row = dict(item)
                if "id" not in row:
                    row["id"] = str(uuid.uuid4())
                self._records.append(row)
                inserted.append(row)
            return MockPostgrestResponse(inserted)

        matching = []
        for r in self._records:
            match = True
            for k, v in self._filters.items():
                if str(r.get(k)) != str(v):
                    match = False
                    break
            if match:
                matching.append(r)

        if self._op == "update":
            updated = []
            for m in matching:
                if self._update_data:
                    m.update(self._update_data)
                    updated.append(dict(m))
            return MockPostgrestResponse(updated)

        if self._op == "delete":
            for m in list(matching):
                if m in self._records:
                    self._records.remove(m)
            return MockPostgrestResponse(matching)

        if self._range_slice:
            start, end = self._range_slice
            matching = matching[start : end + 1]

        return MockPostgrestResponse(matching)


class MockRpcQuery:
    def __init__(self, handler):
        self._handler = handler

    def execute(self):
        if self._handler:
            return self._handler()
        raise Exception("PGRST202: Could not find the function in the schema cache")


class MockSupabaseClient:
    def __init__(self, records, rpc_handlers=None):
        self._records = records
        self._rpc_handlers = rpc_handlers or {}
        self.postgrest = self

    def auth(self, token):
        self._token = token
        return self

    def rpc(self, function_name, params=None):
        handler = self._rpc_handlers.get(function_name)
        if handler:
            return MockRpcQuery(lambda: handler(params))
        return MockRpcQuery(None)

    def table(self, table_name):
        if table_name not in self._records:
            self._records[table_name] = []
        return MockTableQuery(self._records[table_name])


@pytest.fixture
def mock_db_state(
    admin_user_data,
    branch_officer_user_data,
    godown_manager_user_data,
    finance_officer_user_data,
    pre_auditor_user_data,
    general_manager_user_data,
    supplier_user_data,
    supplier2_user_data,
) -> Dict[str, Any]:
    """A realistic initial database state with interconnected relational entities."""
    supp1_id = supplier_user_data["supplier_id"]
    supp2_id = supplier2_user_data["supplier_id"]
    godown1_id = "d0000000-0000-0000-0000-000000000001"
    godown2_id = "d0000000-0000-0000-0000-000000000002"

    order1_id = "f0000000-0000-0000-0000-000000000001"
    order2_id = "f0000000-0000-0000-0000-000000000002"

    deliv1_id = "80000000-0000-0000-0000-000000000001"
    deliv2_id = "80000000-0000-0000-0000-000000000002"

    rcpt1_id = "90000000-0000-0000-0000-000000000001"

    return {
        "user_profiles": [
            admin_user_data,
            branch_officer_user_data,
            godown_manager_user_data,
            finance_officer_user_data,
            pre_auditor_user_data,
            general_manager_user_data,
            supplier_user_data,
            supplier2_user_data,
        ],
        "suppliers": [
            {
                "id": supp1_id,
                "supplier_code": "SUP001",
                "supplier_name": "Agro Commodity Supplies Pvt Ltd",
                "contact_email": "contact@agrocommodity.com",
                "contact_phone": "9876543210",
                "address": "123 Farm Way, Sector 4",
                "is_active": True,
            },
            {
                "id": supp2_id,
                "supplier_code": "SUP002",
                "supplier_name": "Beta Grains Corporation",
                "contact_email": "info@betagrains.com",
                "contact_phone": "9876543211",
                "address": "456 Grain Market, Depot Road",
                "is_active": True,
            },
        ],
        "godowns": [
            {
                "id": godown1_id,
                "godown_code": "GOD001",
                "godown_name": "State Central Godown",
                "location": "Central Depot",
                "is_active": True,
            },
            {
                "id": godown2_id,
                "godown_code": "GOD002",
                "godown_name": "District Storage Depot",
                "location": "North Sub-district",
                "is_active": True,
            },
        ],
        "supply_orders": [
            {
                "id": order1_id,
                "order_number": "ORD-20261024-001",
                "supplier_id": supp1_id,
                "godown_id": godown1_id,
                "commodity_name": "Wheat Grade-A",
                "ordered_quantity": 1000.0,
                "unit": "MT",
                "agreed_rate": 25.50,
                "order_date": "2026-10-24",
                "status": "AUTHORIZED",
            },
            {
                "id": order2_id,
                "order_number": "ORD-20261024-002",
                "supplier_id": supp2_id,
                "godown_id": godown2_id,
                "commodity_name": "Paddy Common",
                "ordered_quantity": 500.0,
                "unit": "MT",
                "agreed_rate": 30.00,
                "order_date": "2026-10-24",
                "status": "AUTHORIZED",
            },
        ],
        "deliveries": [
            {
                "id": deliv1_id,
                "delivery_number": "DEL-20261024-001",
                "supply_order_id": order1_id,
                "delivered_quantity": 400.0,
                "delivery_date": "2026-10-24",
                "verified_by": godown_manager_user_data["id"],
                "status": "DELIVERED",
            },
            {
                "id": deliv2_id,
                "delivery_number": "DEL-20261024-002",
                "supply_order_id": order2_id,
                "delivered_quantity": 250.0,
                "delivery_date": "2026-10-24",
                "verified_by": godown_manager_user_data["id"],
                "status": "DELIVERED",
            },
        ],
        "delivery_receipts": [
            {
                "id": rcpt1_id,
                "receipt_number": "RCPT-20261024-001",
                "delivery_id": deliv1_id,
                "receipt_reference": "WB-88123",
                "issued_by": godown_manager_user_data["id"],
                "status": "ISSUED",
            }
        ],
        "bills": [],
        "bill_deliveries": [],
        "workflow_tasks": [],
        "approvals": [],
        "payments": [],
        "audit_logs": [],
    }
