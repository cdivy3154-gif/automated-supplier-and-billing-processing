from unittest.mock import patch
from tests.conftest import MockSupabaseClient


def test_supplier_me_success(client, supplier_token, mock_db_state, supplier_user_data):
    """Authenticated supplier should retrieve their own supplier organization profile."""
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            "/api/v1/suppliers/me",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == supplier_user_data["supplier_id"]
        assert data["supplier_code"] == "SUP001"
        assert data["supplier_name"] == "Agro Commodity Supplies Pvt Ltd"


def test_supplier_me_unlinked_supplier(client, admin_token, mock_db_state):
    """A user profile with no supplier_id calling /suppliers/me gets 404."""
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            "/api/v1/suppliers/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404
        assert "no supplier organization linked" in response.json()["detail"].lower()


def test_supplier_isolation_cannot_access_other_supplier(
    client, supplier_token, supplier2_user_data, mock_db_state
):
    """Supplier 1 attempting to view Supplier 2's profile must be rejected with 403 Forbidden."""
    supp2_id = supplier2_user_data["supplier_id"]
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/suppliers/{supp2_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "cannot access other suppliers" in response.json()["detail"].lower()


def test_supplier_can_access_own_supplier_id(
    client, supplier_token, supplier_user_data, mock_db_state
):
    """Supplier accessing their own supplier_id via GET /suppliers/{id} succeeds."""
    supp1_id = supplier_user_data["supplier_id"]
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/suppliers/{supp1_id}",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 200
        assert response.json()["id"] == supp1_id


def test_staff_can_view_any_supplier(
    client, branch_officer_token, supplier_user_data, mock_db_state
):
    """Authorized staff (Branch Officer) can view any supplier's profile."""
    supp1_id = supplier_user_data["supplier_id"]
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=MockSupabaseClient(mock_db_state)):
        response = client.get(
            f"/api/v1/suppliers/{supp1_id}",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
        )
        assert response.status_code == 200
        assert response.json()["id"] == supp1_id


def test_supplier_unauthenticated_rejected(client):
    """Unauthenticated calls to /suppliers endpoints return 401."""
    response = client.get("/api/v1/suppliers/me")
    assert response.status_code == 401
