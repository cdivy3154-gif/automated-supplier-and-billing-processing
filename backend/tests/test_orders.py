from unittest.mock import patch
from tests.conftest import MockSupabaseClient


def test_supplier_list_orders_isolated(client, supplier_token, supplier_user_data, mock_db_state):
    """Supplier should only see orders issued to their supplier organization."""
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            "/api/v1/orders",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 200
        orders = response.json()
        assert len(orders) == 1
        assert orders[0]["supplier_id"] == supplier_user_data["supplier_id"]
        assert orders[0]["order_number"] == "ORD-20261024-001"


def test_supplier_filter_other_supplier_forbidden(client, supplier_token, supplier2_user_data, mock_db_state):
    """Supplier attempting to filter by another supplier's ID must receive 403 Forbidden."""
    supp2_id = supplier2_user_data["supplier_id"]
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/orders?supplier_id={supp2_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "cannot query other suppliers" in response.json()["detail"].lower()


def test_supplier_get_order_by_id_isolation(client, supplier_token, mock_db_state):
    """Supplier attempting to fetch an order belonging to another supplier gets 403 Forbidden."""
    order2_id = "f0000000-0000-0000-0000-000000000002"  # Belongs to Supplier 2
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/orders/{order2_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "order belongs to another supplier" in response.json()["detail"].lower()


def test_branch_officer_create_order_success(
    client, branch_officer_token, supplier_user_data, mock_db_state
):
    """Authorized Branch Officer can create a valid supply order."""
    payload = {
        "supplier_id": supplier_user_data["supplier_id"],
        "godown_id": "d0000000-0000-0000-0000-000000000001",
        "commodity_name": "Mustard Seed",
        "ordered_quantity": 200.0,
        "unit": "quintal",
        "agreed_rate": 54.0,
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/orders",
            json=payload,
            headers={"Authorization": f"Bearer {branch_officer_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["commodity_name"] == "Mustard Seed"
        assert float(data["ordered_quantity"]) == 200.0
        assert data["status"] == "AUTHORIZED"


def test_supplier_create_order_forbidden(client, supplier_token, supplier_user_data, mock_db_state):
    """Suppliers are strictly prohibited from creating supply orders (403 Forbidden)."""
    payload = {
        "supplier_id": supplier_user_data["supplier_id"],
        "godown_id": "d0000000-0000-0000-0000-000000000001",
        "commodity_name": "Unauthorized Order",
        "ordered_quantity": 100.0,
        "unit": "MT",
        "agreed_rate": 20.0,
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/orders",
            json=payload,
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403


def test_create_order_invalid_quantity(client, branch_officer_token, supplier_user_data, mock_db_state):
    """Zero or negative ordered quantity is rejected with 422 Unprocessable Entity."""
    payload = {
        "supplier_id": supplier_user_data["supplier_id"],
        "godown_id": "d0000000-0000-0000-0000-000000000001",
        "commodity_name": "Wheat",
        "ordered_quantity": -50.0,
        "unit": "kg",
        "agreed_rate": 25.0,
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/orders",
            json=payload,
            headers={"Authorization": f"Bearer {branch_officer_token}"},
        )
        assert response.status_code == 422


def test_create_order_nonexistent_supplier(client, branch_officer_token, mock_db_state):
    """Attempting to create an order referencing a non-existent supplier returns 404."""
    payload = {
        "supplier_id": "00000000-0000-0000-0000-000000009999",
        "godown_id": "d0000000-0000-0000-0000-000000000001",
        "commodity_name": "Wheat",
        "ordered_quantity": 100.0,
        "unit": "kg",
        "agreed_rate": 25.0,
    }
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.post(
            "/api/v1/orders",
            json=payload,
            headers={"Authorization": f"Bearer {branch_officer_token}"},
        )
        assert response.status_code == 404
        assert "referenced supplier id" in response.json()["detail"].lower()
