from unittest.mock import patch
from tests.conftest import MockSupabaseClient


def test_godown_manager_record_delivery_success(
    client, godown_manager_token, godown_manager_user_data, mock_db_state
):
    """Godown manager records physical delivery; verified_by is securely bound to their user ID."""
    order1_id = "f0000000-0000-0000-0000-000000000001"
    payload = {
        "supply_order_id": order1_id,
        "delivered_quantity": 250.0,
        "delivery_date": "2026-10-24",
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/deliveries",
            json=payload,
            headers={"Authorization": f"Bearer {godown_manager_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert float(data["delivered_quantity"]) == 250.0
        assert data["verified_by"] == godown_manager_user_data["id"]
        assert data["status"] == "DELIVERED"


def test_delivery_exceeding_order_quantity_rejected(
    client, godown_manager_token, mock_db_state
):
    """Delivered quantity exceeding remaining ordered limit is rejected with 400 Bad Request."""
    order1_id = "f0000000-0000-0000-0000-000000000001"
    # Order has 1000 ordered, 400 already delivered; attempting 700 exceeds 1000
    payload = {
        "supply_order_id": order1_id,
        "delivered_quantity": 700.0,
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/deliveries",
            json=payload,
            headers={"Authorization": f"Bearer {godown_manager_token}"},
        )
        assert response.status_code == 400
        assert "exceeds ordered limit" in response.json()["detail"].lower()


def test_supplier_record_delivery_forbidden(client, supplier_token, mock_db_state):
    """Suppliers are forbidden from recording physical deliveries (403 Forbidden)."""
    payload = {
        "supply_order_id": "f0000000-0000-0000-0000-000000000001",
        "delivered_quantity": 100.0,
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/deliveries",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403


def test_supplier_list_deliveries_isolation(client, supplier_token, mock_db_state):
    """Supplier requesting deliveries only sees deliveries associated with their own supplier orders."""
    other_order_id = "f0000000-0000-0000-0000-000000000002"  # Belongs to Supplier 2
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/deliveries?supply_order_id={other_order_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "order belongs to another supplier" in response.json()["detail"].lower()


def test_supplier_get_delivery_other_supplier_forbidden(client, supplier_token, mock_db_state):
    """Supplier requesting delivery of another supplier gets 403 Forbidden."""
    deliv2_id = "80000000-0000-0000-0000-000000000002"  # Belongs to Supplier 2
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/deliveries/{deliv2_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "belongs to another supplier" in response.json()["detail"].lower()
