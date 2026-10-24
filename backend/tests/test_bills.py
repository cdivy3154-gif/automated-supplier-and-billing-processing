from decimal import Decimal
from unittest.mock import patch
from tests.conftest import MockSupabaseClient


def test_supplier_submit_bill_success(
    client, supplier_token, supplier_user_data, mock_db_state
):
    """
    Supplier submits commercial invoice for verified delivery with issued receipt.
    Monetary amounts are calculated strictly on server using Decimal arithmetic.
    """
    deliv1_id = "80000000-0000-0000-0000-000000000001"
    payload = {
        "invoice_number": "INV-2026-001",
        "invoice_date": "2026-10-24",
        "delivery_items": [
            {
                "delivery_id": deliv1_id,
                "billed_quantity": 400.0,
                # rate omitted to test server-side derivation from agreed_rate (25.50)
            }
        ],
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/bills",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["supplier_id"] == supplier_user_data["supplier_id"]
        assert data["invoice_number"] == "INV-2026-001"
        # 400.0 * 25.50 = 10200.00
        assert Decimal(str(data["total_amount"])) == Decimal("10200.00")
        assert data["status"] == "SUBMITTED"
        assert len(data["items"]) == 1
        assert Decimal(str(data["items"][0]["amount"])) == Decimal("10200.00")


def test_duplicate_invoice_number_rejected(client, supplier_token, mock_db_state):
    """Submitting duplicate invoice number for the same supplier returns 409 Conflict."""
    deliv1_id = "80000000-0000-0000-0000-000000000001"
    payload = {
        "invoice_number": "INV-DUP-TEST",
        "invoice_date": "2026-10-24",
        "delivery_items": [{"delivery_id": deliv1_id, "billed_quantity": 100.0}],
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=MockSupabaseClient(mock_db_state)):
        # First submission
        r1 = client.post("/api/v1/bills", json=payload, headers={"Authorization": f"Bearer {supplier_token}"})
        assert r1.status_code == 201

        # Duplicate invoice number submission
        r2 = client.post("/api/v1/bills", json=payload, headers={"Authorization": f"Bearer {supplier_token}"})
        assert r2.status_code == 409
        assert "already been submitted" in r2.json()["detail"].lower()


def test_billed_quantity_exceeds_delivered_rejected(client, supplier_token, mock_db_state):
    """Billed quantity exceeding actual physical delivered quantity is rejected with 400."""
    deliv1_id = "80000000-0000-0000-0000-000000000001"  # Delivered was 400.0
    payload = {
        "invoice_number": "INV-QTY-EXCEED",
        "invoice_date": "2026-10-24",
        "delivery_items": [{"delivery_id": deliv1_id, "billed_quantity": 500.0}],
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/bills",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 400
        assert "exceeds delivered quantity" in response.json()["detail"].lower()


def test_delivery_without_receipt_cannot_be_billed(client, supplier_token, mock_db_state):
    """Deliveries that do not have an issued receipt cannot be billed."""
    # Create delivery without receipt for Supplier 1
    no_rcpt_deliv_id = "80000000-0000-0000-0000-000000000055"
    mock_db_state["deliveries"].append({
        "id": no_rcpt_deliv_id,
        "delivery_number": "DEL-NO-RCPT",
        "supply_order_id": "f0000000-0000-0000-0000-000000000001",
        "delivered_quantity": 100.0,
        "delivery_date": "2026-10-24",
        "verified_by": "a0000000-0000-0000-0000-000000000020",
        "status": "DELIVERED",
    })
    payload = {
        "invoice_number": "INV-NO-RCPT",
        "invoice_date": "2026-10-24",
        "delivery_items": [{"delivery_id": no_rcpt_deliv_id, "billed_quantity": 100.0}],
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/bills",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 400
        assert "does not have an issued delivery receipt" in response.json()["detail"].lower()


def test_delivery_belonging_to_other_supplier_rejected(client, supplier_token, mock_db_state):
    """Supplier 1 attempting to bill delivery of Supplier 2 is rejected with 403 Forbidden."""
    deliv2_id = "80000000-0000-0000-0000-000000000002"  # Belongs to Supplier 2
    # Add receipt for deliv2
    mock_db_state["delivery_receipts"].append({
        "id": "90000000-0000-0000-0000-000000000002",
        "receipt_number": "RCPT-2",
        "delivery_id": deliv2_id,
        "issued_by": "a0000000-0000-0000-0000-000000000020",
        "status": "ISSUED",
    })
    payload = {
        "invoice_number": "INV-STEAL-DELIV",
        "invoice_date": "2026-10-24",
        "delivery_items": [{"delivery_id": deliv2_id, "billed_quantity": 50.0}],
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/bills",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "does not belong to the authenticated supplier" in response.json()["detail"].lower()


def test_already_billed_delivery_rejected(client, supplier_token, mock_db_state):
    """Attempting to double-bill an already billed delivery returns 409 Conflict."""
    deliv1_id = "80000000-0000-0000-0000-000000000001"
    # Mark deliv1_id as already billed in bill_deliveries
    mock_db_state["bill_deliveries"].append({
        "id": "70000000-0000-0000-0000-000000000001",
        "bill_id": "60000000-0000-0000-0000-000000000001",
        "delivery_id": deliv1_id,
        "billed_quantity": 400.0,
        "rate": 25.50,
        "amount": 10200.0,
    })
    payload = {
        "invoice_number": "INV-REBILL",
        "invoice_date": "2026-10-24",
        "delivery_items": [{"delivery_id": deliv1_id, "billed_quantity": 400.0}],
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/bills",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 409
        assert "already been billed" in response.json()["detail"].lower()


def test_supplier_get_bill_other_supplier_forbidden(client, supplier_token, mock_db_state):
    """Supplier requesting details of another supplier's bill gets 403 Forbidden."""
    supp2_bill_id = "60000000-0000-0000-0000-000000000002"
    mock_db_state["bills"].append({
        "id": supp2_bill_id,
        "bill_number": "BILL-SUPP2-001",
        "supplier_id": "c0000000-0000-0000-0000-000000000005",  # Supplier 2
        "invoice_number": "INV-BETA-001",
        "invoice_date": "2026-10-24",
        "total_amount": 7500.0,
        "status": "SUBMITTED",
        "submitted_by": "b0000000-0000-0000-0000-000000000004",
    })
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/bills/{supp2_bill_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "bill belongs to another supplier" in response.json()["detail"].lower()
