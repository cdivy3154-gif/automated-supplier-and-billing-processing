from unittest.mock import patch
from tests.conftest import MockSupabaseClient


def test_godown_manager_issue_receipt_success(
    client, godown_manager_token, godown_manager_user_data, mock_db_state
):
    """Authorized Godown Manager issues digital receipt for eligible delivery."""
    deliv2_id = "80000000-0000-0000-0000-000000000002"  # Has no receipt yet
    payload = {
        "delivery_id": deliv2_id,
        "receipt_reference": "WB-99124",
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/receipts",
            json=payload,
            headers={"Authorization": f"Bearer {godown_manager_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["delivery_id"] == deliv2_id
        assert data["receipt_reference"] == "WB-99124"
        assert data["issued_by"] == godown_manager_user_data["id"]
        assert data["status"] == "ISSUED"


def test_duplicate_receipt_rejected(client, godown_manager_token, mock_db_state):
    """Attempting to issue a second receipt for the same delivery returns 409 Conflict."""
    deliv1_id = "80000000-0000-0000-0000-000000000001"  # Already has RCPT-20261024-001
    payload = {"delivery_id": deliv1_id}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/receipts",
            json=payload,
            headers={"Authorization": f"Bearer {godown_manager_token}"},
        )
        assert response.status_code == 409
        assert "already been issued" in response.json()["detail"].lower()


def test_unverified_delivery_cannot_get_receipt(
    client, godown_manager_token, mock_db_state
):
    """Deliveries missing verified_by must be rejected for receipt issuance."""
    unverified_deliv_id = "80000000-0000-0000-0000-000000000099"
    mock_db_state["deliveries"].append({
        "id": unverified_deliv_id,
        "delivery_number": "DEL-UNVERIFIED",
        "supply_order_id": "f0000000-0000-0000-0000-000000000001",
        "delivered_quantity": 50.0,
        "delivery_date": "2026-10-24",
        "verified_by": None,  # Not verified!
        "status": "DELIVERED",
    })
    payload = {"delivery_id": unverified_deliv_id}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/receipts",
            json=payload,
            headers={"Authorization": f"Bearer {godown_manager_token}"},
        )
        assert response.status_code == 400
        assert "unverified delivery" in response.json()["detail"].lower()


def test_supplier_issue_receipt_forbidden(client, supplier_token, mock_db_state):
    """Suppliers are forbidden from issuing delivery receipts (403 Forbidden)."""
    payload = {"delivery_id": "80000000-0000-0000-0000-000000000002"}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/receipts",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403


def test_supplier_get_receipt_other_supplier_forbidden(client, supplier_token, mock_db_state):
    """Supplier accessing a receipt for another supplier's delivery gets 403 Forbidden."""
    # Create receipt for Supplier 2
    deliv2_id = "80000000-0000-0000-0000-000000000002"
    rcpt2_id = "90000000-0000-0000-0000-000000000002"
    mock_db_state["delivery_receipts"].append({
        "id": rcpt2_id,
        "receipt_number": "RCPT-20261024-002",
        "delivery_id": deliv2_id,
        "receipt_reference": "WB-2",
        "issued_by": "a0000000-0000-0000-0000-000000000020",
        "status": "ISSUED",
    })
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/receipts/{rcpt2_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "belongs to another supplier" in response.json()["detail"].lower()
