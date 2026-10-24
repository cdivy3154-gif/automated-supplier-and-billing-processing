"""Focused Security and Transaction Integrity Tests for Phase 2C."""

from decimal import Decimal
from typing import Any, Dict
from unittest.mock import patch
import pytest
from starlette.testclient import TestClient

from app.core.config import settings
from app.schemas.user import UserRole
from tests.conftest import MockSupabaseClient, MockTableQuery


def test_audit_failure_triggers_compensating_rollback_in_approvals(
    client: TestClient,
    branch_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that if audit logging fails during workflow approval,
    the failure is NOT silently swallowed, the changes are rolled back,
    and a 500 Internal Server Error is returned.
    """
    bill_id = "e0000000-0000-0000-0000-000000000071"
    task_id = "f0000000-0000-0000-0000-000000000071"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-AUDIT-FAIL",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 2000.0,
        "status": "SUBMITTED",
    })
    mock_db_state["workflow_tasks"].append({
        "id": task_id,
        "bill_id": bill_id,
        "assigned_role": UserRole.BRANCH_OFFICER.value,
        "status": "PENDING",
        "remarks": "Awaiting initial branch review",
    })

    class FailingAuditDb(MockSupabaseClient):
        def table(self, table_name):
            if table_name == "audit_logs":
                class FailingQuery(MockTableQuery):
                    def execute(self):
                        if self._op == "insert":
                            raise RuntimeError("Audit log table write failure")
                        return super().execute()
                return FailingQuery(self._records.get(table_name, []))
            return super().table(table_name)

    failing_db = FailingAuditDb(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=failing_db), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=failing_db), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=failing_db):

        resp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={
                "workflow_task_id": task_id,
                "decision": "APPROVED",
                "comments": "Approving branch review",
            },
        )
        # Must fail with 500 instead of silently swallowing the audit failure
        assert resp.status_code == 500
        assert "rolled back" in resp.json()["detail"].lower()

        # Verify state is completely rolled back
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill["status"] == "SUBMITTED"  # NOT BRANCH_APPROVED!

        task = next(t for t in mock_db_state["workflow_tasks"] if t["id"] == task_id)
        assert task["status"] == "PENDING"  # NOT COMPLETED!

        # Approvals record was cleaned up
        approvals_for_bill = [a for a in mock_db_state["approvals"] if a["bill_id"] == bill_id]
        assert len(approvals_for_bill) == 0


def test_audit_failure_triggers_compensating_rollback_in_payment_initiation(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that if audit logging fails during payment initiation,
    the payment record is rolled back, bill status is reverted,
    and a 500 error is returned.
    """
    bill_id = "e0000000-0000-0000-0000-000000000072"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PAY-AUDIT-FAIL",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 5000.0,
        "status": "APPROVED",
    })

    class FailingAuditDb(MockSupabaseClient):
        def table(self, table_name):
            if table_name == "audit_logs":
                class FailingQuery(MockTableQuery):
                    def execute(self):
                        if self._op == "insert":
                            raise RuntimeError("Audit log table failure")
                        return super().execute()
                return FailingQuery(self._records.get(table_name, []))
            return super().table(table_name)

    failing_db = FailingAuditDb(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=failing_db), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=failing_db), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=failing_db):

        resp = client.post(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"bill_id": bill_id},
        )
        assert resp.status_code == 500
        assert "rolled back" in resp.json()["detail"].lower()

        # Bill remains APPROVED, not PAYMENT_PENDING
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill["status"] == "APPROVED"

        # Payment was removed
        payments = [p for p in mock_db_state["payments"] if p["bill_id"] == bill_id]
        assert len(payments) == 0


def test_missing_rpc_fails_closed_in_production(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that if the RPC is unavailable in a production environment,
    the API fails closed with 503 Service Unavailable rather than silently
    falling back to non-atomic multi-step writes.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000073"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PROD-TEST",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 1000.0,
        "status": "APPROVED",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client), \
         patch.object(settings, "ENVIRONMENT", "production"):

        resp = client.post(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"bill_id": bill_id},
        )
        assert resp.status_code == 503
        assert "procedure" in resp.json()["detail"].lower()
        assert "unavailable in production" in resp.json()["detail"].lower()


def test_cannot_simulate_payment_for_already_paid_bill(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that once a bill reaches PAID status, further simulated status
    transitions are rejected with 409 Conflict to protect the terminal state.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000074"
    pay_id = "70000000-0000-0000-0000-000000000074"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-ALREADY-PAID",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 3000.0,
        "status": "PAID",
    })
    mock_db_state["payments"].append({
        "id": pay_id,
        "bill_id": bill_id,
        "payment_reference": "PAY-ALREADY-PAID",
        "amount": 3000.0,
        "status": "INITIATED",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        resp = client.post(
            f"/api/v1/payments/{pay_id}/simulate-status",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"target_status": "SUCCESS"},
        )
        assert resp.status_code == 409
        assert "already in terminal status 'paid'" in resp.json()["detail"].lower()
