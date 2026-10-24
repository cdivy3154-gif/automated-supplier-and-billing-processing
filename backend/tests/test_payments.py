"""Tests for Phase 2C Simulated Payment Processing Endpoints."""

from decimal import Decimal
from typing import Any, Dict
from unittest.mock import patch
import pytest
from starlette.testclient import TestClient

from app.schemas.user import UserRole
from tests.conftest import MockSupabaseClient


def test_payment_initiation_for_approved_bill(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that a Finance Officer can initiate payment for an APPROVED bill:
    - Creates a payment record in 'INITIATED' status.
    - Authoritative amount is locked to bill.total_amount.
    - Generates server reference if omitted.
    - Transitions bill status to 'PAYMENT_PENDING'.
    - Records audit log.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000010"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PAY-001",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 10200.0,
        "status": "APPROVED",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        resp = client.post(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"bill_id": bill_id},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["bill_id"] == bill_id
        assert Decimal(str(data["amount"])) == Decimal("10200.0")
        assert data["status"] == "INITIATED"
        assert data["payment_reference"].startswith("PAY-")

        # Verify bill status transitioned to PAYMENT_PENDING
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill["status"] == "PAYMENT_PENDING"

        # Verify payment recorded in database
        assert len(mock_db_state["payments"]) == 1
        assert mock_db_state["payments"][0]["id"] == data["id"]

        # Verify audit log recorded
        audit = next((a for a in mock_db_state["audit_logs"] if a["action"] == "INITIATE_PAYMENT"), None)
        assert audit is not None
        assert audit["entity_id"] == data["id"]


def test_payment_initiation_rejected_for_unapproved_bill(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that payment initiation is rejected if the bill has not reached
    'APPROVED' (or 'PAYMENT_FAILED' for retry) status.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_sub = "e0000000-0000-0000-0000-000000000011"
    bill_gm = "e0000000-0000-0000-0000-000000000012"
    bill_rej = "e0000000-0000-0000-0000-000000000013"

    mock_db_state["bills"].extend([
        {"id": bill_sub, "bill_number": "B-SUB", "supplier_id": mock_db_state["suppliers"][0]["id"], "total_amount": 500.0, "status": "SUBMITTED"},
        {"id": bill_gm, "bill_number": "B-GM", "supplier_id": mock_db_state["suppliers"][0]["id"], "total_amount": 500.0, "status": "GM_APPROVED"},
        {"id": bill_rej, "bill_number": "B-REJ", "supplier_id": mock_db_state["suppliers"][0]["id"], "total_amount": 500.0, "status": "REJECTED"},
    ])

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        for bid in (bill_sub, bill_gm, bill_rej):
            resp = client.post(
                "/api/v1/payments",
                headers={"Authorization": f"Bearer {finance_officer_token}"},
                json={"bill_id": bid},
            )
            assert resp.status_code == 400
            assert "cannot initiate payment" in resp.json()["detail"].lower()


def test_payment_initiation_idempotency(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that calling initiate_payment multiple times for the same bill
    returns the existing active payment record without creating duplicates.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000014"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PAY-IDEM",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 7500.0,
        "status": "APPROVED",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        resp1 = client.post(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"bill_id": bill_id},
        )
        assert resp1.status_code == 201
        data1 = resp1.json()

        # Second call
        resp2 = client.post(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"bill_id": bill_id},
        )
        assert resp2.status_code in (200, 201)
        data2 = resp2.json()

        assert data1["id"] == data2["id"]
        assert data1["payment_reference"] == data2["payment_reference"]
        # Exactly 1 payment in database
        assert len(mock_db_state["payments"]) == 1


def test_unauthorized_roles_forbidden_from_payment_actions(
    client: TestClient,
    supplier_token: str,
    branch_officer_token: str,
    godown_manager_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that unauthorized roles cannot initiate payments or simulate callbacks:
    - SUPPLIER receives 403 Forbidden.
    - BRANCH_OFFICER receives 403 Forbidden.
    - GODOWN_MANAGER receives 403 Forbidden.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000015"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-FORBIDDEN",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 1000.0,
        "status": "APPROVED",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        for token in (supplier_token, branch_officer_token, godown_manager_token):
            resp = client.post(
                "/api/v1/payments",
                headers={"Authorization": f"Bearer {token}"},
                json={"bill_id": bill_id},
            )
            assert resp.status_code == 403

        # Supplier attempting to simulate payment status -> 403 Forbidden
        pay_id = "70000000-0000-0000-0000-000000000015"
        mock_db_state["payments"].append({
            "id": pay_id,
            "bill_id": bill_id,
            "payment_reference": "PAY-TEST-99",
            "amount": 1000.0,
            "status": "INITIATED",
        })
        resp_sim = client.post(
            f"/api/v1/payments/{pay_id}/simulate-status",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"target_status": "SUCCESS"},
        )
        assert resp_sim.status_code == 403


def test_simulated_payment_success_transitions_bill_to_paid(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that a successful simulated payment gateway callback:
    - Sets payment status to 'SUCCESS' and records confirmed_at.
    - Transitions bill status to 'PAID'.
    - Records audit log.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000016"
    pay_id = "70000000-0000-0000-0000-000000000016"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PAY-SUCC",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 4500.0,
        "status": "PAYMENT_PENDING",
    })
    mock_db_state["payments"].append({
        "id": pay_id,
        "bill_id": bill_id,
        "payment_reference": "PAY-20261024-SUCC1",
        "amount": 4500.0,
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
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert data["confirmed_at"] is not None

        # Verify bill is marked PAID
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill["status"] == "PAID"

        # Verify audit log
        audit = next((a for a in mock_db_state["audit_logs"] if a["action"] == "CONFIRM_PAYMENT_SUCCESS"), None)
        assert audit is not None


def test_simulated_payment_failed_allows_retry(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that a failed payment callback transitions bill to PAYMENT_FAILED
    and allows a subsequent retry initiation.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000017"
    pay1_id = "70000000-0000-0000-0000-000000000017"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PAY-FAIL",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 3200.0,
        "status": "PAYMENT_PENDING",
    })
    mock_db_state["payments"].append({
        "id": pay1_id,
        "bill_id": bill_id,
        "payment_reference": "PAY-20261024-FAIL1",
        "amount": 3200.0,
        "status": "INITIATED",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # 1. Simulate failure callback
        resp_fail = client.post(
            f"/api/v1/payments/{pay1_id}/simulate-status",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"target_status": "FAILED", "reason": "Bank account IFSC code mismatch"},
        )
        assert resp_fail.status_code == 200
        assert resp_fail.json()["status"] == "FAILED"

        # Bill must now be PAYMENT_FAILED
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill["status"] == "PAYMENT_FAILED"

        # 2. Finance Officer retries payment initiation
        resp_retry = client.post(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={"bill_id": bill_id},
        )
        assert resp_retry.status_code == 201
        data_retry = resp_retry.json()
        assert data_retry["id"] != pay1_id
        assert data_retry["status"] == "INITIATED"
        assert Decimal(str(data_retry["amount"])) == Decimal("3200.0")

        # Bill transitioned back to PAYMENT_PENDING
        assert bill["status"] == "PAYMENT_PENDING"
        # Total payments in database now 2
        assert len(mock_db_state["payments"]) == 2


def test_terminal_payment_simulation_rejected(
    client: TestClient,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that a payment already in terminal status (SUCCESS)
    cannot be simulated or transitioned again (409 Conflict).
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000018"
    pay_id = "70000000-0000-0000-0000-000000000018"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-PAY-TERMINAL",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 1800.0,
        "status": "PAID",
    })
    mock_db_state["payments"].append({
        "id": pay_id,
        "bill_id": bill_id,
        "payment_reference": "PAY-20261024-TERM1",
        "amount": 1800.0,
        "status": "SUCCESS",
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
        assert "already in terminal status" in resp.json()["detail"].lower()


def test_payment_read_isolation(
    client: TestClient,
    supplier_token: str,
    supplier2_token: str,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies tenant isolation on payment records:
    - Supplier 1 sees only their own bill's payment in list.
    - Supplier 2 receives 403 Forbidden accessing Supplier 1's payment directly.
    - Finance Officer can view all payment records.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    b1_id = "e0000000-0000-0000-0000-000000000019"
    b2_id = "e0000000-0000-0000-0000-000000000020"
    p1_id = "70000000-0000-0000-0000-000000000019"
    p2_id = "70000000-0000-0000-0000-000000000020"

    mock_db_state["bills"].extend([
        {"id": b1_id, "bill_number": "BILL-S1", "supplier_id": mock_db_state["suppliers"][0]["id"], "total_amount": 1000.0, "status": "PAID"},
        {"id": b2_id, "bill_number": "BILL-S2", "supplier_id": mock_db_state["suppliers"][1]["id"], "total_amount": 2000.0, "status": "PAID"},
    ])
    mock_db_state["payments"].extend([
        {"id": p1_id, "bill_id": b1_id, "payment_reference": "PAY-S1", "amount": 1000.0, "status": "SUCCESS"},
        {"id": p2_id, "bill_id": b2_id, "payment_reference": "PAY-S2", "amount": 2000.0, "status": "SUCCESS"},
    ])

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Supplier 1 list payments -> only returns payment 1
        resp_list = client.get(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert resp_list.status_code == 200
        items = resp_list.json()
        assert len(items) == 1
        assert items[0]["id"] == p1_id

        # Supplier 2 attempts to get Payment 1 directly -> 403 Forbidden
        resp_get_p1 = client.get(
            f"/api/v1/payments/{p1_id}",
            headers={"Authorization": f"Bearer {supplier2_token}"},
        )
        assert resp_get_p1.status_code == 403

        # Supplier 2 attempts to get Payment for Bill 1 -> 403 Forbidden
        resp_get_b1 = client.get(
            f"/api/v1/payments/bills/{b1_id}/payment",
            headers={"Authorization": f"Bearer {supplier2_token}"},
        )
        assert resp_get_b1.status_code == 403

        # Finance Officer list payments -> sees both
        resp_fo = client.get(
            "/api/v1/payments",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
        )
        assert resp_fo.status_code == 200
        assert len(resp_fo.json()) == 2
