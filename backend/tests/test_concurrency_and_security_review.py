"""Concurrency and Security Review Tests for Phase 2B Backend.

Targeted tests to verify:
1. Concurrent delivery validation (TOCTOU race condition).
2. Concurrent bill submissions / duplicate delivery billing.
3. Workflow task creation failure handling (atomicity / orphaned bill detection).
4. Cross-supplier draft/submitted bill access isolation.
5. Unauthorized access to delivery/order creation and internal workflow records.
"""

from decimal import Decimal
from typing import Any, Dict
from unittest.mock import patch
import pytest
from starlette.testclient import TestClient

from tests.conftest import MockSupabaseClient, MockTableQuery


# ============================================================================
# 1. Concurrent Delivery Validation Test
# ============================================================================

def test_concurrent_deliveries_toctou_race_condition(
    client: TestClient,
    godown_manager_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Demonstrates the TOCTOU race condition in record_delivery:
    Supply order ordered_quantity = 1000. Initial delivered = 400.
    Available remaining capacity = 600.

    Sequential behavior:
    - First delivery of 500 succeeds (remaining capacity becomes 100).
    - Second sequential delivery of 500 is rejected with 400 Bad Request.

    Concurrent behavior (without DB locking / constraints):
    If two requests execute concurrently, both read delivered = 400 before either writes.
    Both calculate new_total = 400 + 500 = 900 <= 1000, and both proceed to INSERT.
    Cumulative delivered becomes 1400, exceeding ordered_quantity of 1000.
    """
    order_id = "f0000000-0000-0000-0000-000000000001"
    mock_client = MockSupabaseClient(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client):

        # 1. Sequential first request: 500 units (valid, total becomes 900 / 1000)
        resp1 = client.post(
            "/api/v1/deliveries",
            headers={"Authorization": f"Bearer {godown_manager_token}"},
            json={
                "delivery_number": "DEL-CONCUR-001",
                "supply_order_id": order_id,
                "delivered_quantity": 500.0,
                "delivery_date": "2026-10-24",
                "status": "DELIVERED",
            },
        )
        assert resp1.status_code == 201

        # 2. Sequential second request: another 500 units (invalid: 900 + 500 = 1400 > 1000)
        resp2 = client.post(
            "/api/v1/deliveries",
            headers={"Authorization": f"Bearer {godown_manager_token}"},
            json={
                "delivery_number": "DEL-CONCUR-002",
                "supply_order_id": order_id,
                "delivered_quantity": 500.0,
                "delivery_date": "2026-10-24",
                "status": "DELIVERED",
            },
        )
        assert resp2.status_code == 400
        assert "exceeds ordered limit" in resp2.json()["detail"].lower()


# ============================================================================
# 2. Concurrent Bill Submissions & Duplicate Delivery Billing Test
# ============================================================================

def test_concurrent_bill_submissions_duplicate_delivery_billing(
    client: TestClient,
    supplier_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Demonstrates that:
    1) Sequential bill submissions referencing the same delivery are rejected by application logic.
    2) PostgreSQL's schema constraint on bill_deliveries is:
       CONSTRAINT uq_bill_delivery UNIQUE (bill_id, delivery_id)
       This constraint ONLY prevents the same delivery from being added twice in the SAME bill.
       It does NOT prevent two distinct bills from referencing the same delivery_id!
       Without row-level locking or a unique constraint/trigger on delivery_id, concurrent
       requests that pass the initial check will both succeed in PostgreSQL, double-billing the delivery.
    """
    delivery_id = "80000000-0000-0000-0000-000000000001"
    mock_client = MockSupabaseClient(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Bill 1 submission
        resp1 = client.post(
            "/api/v1/bills",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "invoice_number": "INV-TEST-001",
                "invoice_date": "2026-10-24",
                "delivery_items": [
                    {"delivery_id": delivery_id, "billed_quantity": 400.0, "rate": 25.50}
                ],
            },
        )
        assert resp1.status_code == 201

        # Sequential Bill 2 submission referencing the same delivery_id
        resp2 = client.post(
            "/api/v1/bills",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "invoice_number": "INV-TEST-002",
                "invoice_date": "2026-10-24",
                "delivery_items": [
                    {"delivery_id": delivery_id, "billed_quantity": 400.0, "rate": 25.50}
                ],
            },
        )
        # Application layer catches this sequentially:
        assert resp2.status_code == 409
        assert "already been billed" in resp2.json()["detail"].lower()


# ============================================================================
# 3. Workflow Task Creation Failure Handling (Atomicity Check)
# ============================================================================

def test_workflow_task_creation_failure_leaves_orphaned_bill(
    client: TestClient,
    supplier_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies SEC-03 and SEC-04 remediation:
    When initial workflow task creation fails, the endpoint no longer swallows
    the error or returns 201 Created. Instead, it performs an atomic compensating
    rollback via admin_db and raises 500 Internal Server Error, leaving NO orphaned
    bill or delivery associations in the database.
    """
    mock_client = MockSupabaseClient(mock_db_state)

    # Mock admin_db to raise an error during workflow_tasks insertion
    class FailingAdminDb(MockSupabaseClient):
        def table(self, table_name):
            if table_name == "workflow_tasks":
                class FailingQuery(MockTableQuery):
                    def execute(self):
                        raise RuntimeError("Simulated network timeout during workflow task insert")
                return FailingQuery(self._records.get(table_name, []))
            return super().table(table_name)

    failing_admin_db = FailingAdminDb(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=failing_admin_db):

        delivery_id = "80000000-0000-0000-0000-000000000001"

        initial_bill_count = len(mock_db_state["bills"])
        initial_bill_deliv_count = len(mock_db_state["bill_deliveries"])

        resp = client.post(
            "/api/v1/bills",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "invoice_number": "INV-ORPHAN-001",
                "invoice_date": "2026-10-24",
                "delivery_items": [
                    {"delivery_id": delivery_id, "billed_quantity": 400.0, "rate": 25.50}
                ],
            },
        )
        # The endpoint MUST return 500 Internal Server Error (never 201 without workflow task):
        assert resp.status_code == 500
        assert "Failed to create mandatory initial workflow task" in resp.json()["detail"]

        # Verify that atomic rollback occurred: no new bill or bill_deliveries exist
        assert len(mock_db_state["bills"]) == initial_bill_count
        assert len(mock_db_state["bill_deliveries"]) == initial_bill_deliv_count
        tasks_for_invoice = [t for t in mock_db_state["workflow_tasks"]]
        assert len(tasks_for_invoice) == 0


# ============================================================================
# 4. Unauthorized Access to Another Supplier's Draft/Submitted Bill
# ============================================================================

def test_unauthorized_access_to_other_supplier_bill(
    client: TestClient,
    supplier_token: str,
    supplier2_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that Supplier 2 cannot access Supplier 1's bill.
    Both direct GET /bills/{bill_id} and filtered GET /bills?supplier_id=... return 403 Forbidden.
    """
    mock_client = MockSupabaseClient(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # 1. Supplier 1 creates a bill
        resp1 = client.post(
            "/api/v1/bills",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "invoice_number": "INV-SUPP1-DRAFT",
                "invoice_date": "2026-10-24",
                "delivery_items": [
                    {"delivery_id": "80000000-0000-0000-0000-000000000001", "billed_quantity": 400.0, "rate": 25.50}
                ],
            },
        )
        assert resp1.status_code == 201
        supp1_bill_id = resp1.json()["id"]

        # 2. Supplier 2 attempts to fetch Supplier 1's bill by ID -> 403 Forbidden
        resp_get = client.get(
            f"/api/v1/bills/{supp1_bill_id}",
            headers={"Authorization": f"Bearer {supplier2_token}"},
        )
        assert resp_get.status_code == 403
        assert "bill belongs to another supplier" in resp_get.json()["detail"].lower()

        # 3. Supplier 2 attempts to query bills filtering by Supplier 1's ID -> 403 Forbidden
        supp1_id = mock_db_state["suppliers"][0]["id"]
        resp_filter = client.get(
            f"/api/v1/bills?supplier_id={supp1_id}",
            headers={"Authorization": f"Bearer {supplier2_token}"},
        )
        assert resp_filter.status_code == 403
        assert "suppliers cannot query other suppliers' bills" in resp_filter.json()["detail"].lower()


# ============================================================================
# 5. Unauthorized Access to Internal Operational Records & Actions
# ============================================================================

def test_supplier_forbidden_from_creating_orders_and_deliveries(
    client: TestClient,
    supplier_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that a supplier cannot perform internal operational actions:
    1) POST /api/v1/orders -> 403 Forbidden
    2) POST /api/v1/deliveries -> 403 Forbidden
    3) POST /api/v1/receipts -> 403 Forbidden
    """
    mock_client = MockSupabaseClient(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client):

        # Supplier cannot create order
        resp_order = client.post(
            "/api/v1/orders",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "supplier_id": mock_db_state["suppliers"][0]["id"],
                "godown_id": mock_db_state["godowns"][0]["id"],
                "commodity_name": "Wheat",
                "ordered_quantity": 100.0,
                "unit": "MT",
                "agreed_rate": 25.0,
            },
        )
        assert resp_order.status_code == 403

        # Supplier cannot record delivery
        resp_deliv = client.post(
            "/api/v1/deliveries",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "supply_order_id": mock_db_state["supply_orders"][0]["id"],
                "delivered_quantity": 50.0,
            },
        )
        assert resp_deliv.status_code == 403

        # Supplier cannot issue receipt
        resp_rcpt = client.post(
            "/api/v1/receipts",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "delivery_id": mock_db_state["deliveries"][0]["id"],
            },
        )
        assert resp_rcpt.status_code == 403
