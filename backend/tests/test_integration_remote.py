import os
import pytest
from app.core.config import settings
from supabase import create_client


@pytest.mark.integration
def test_live_remote_supabase_read_only_integration(client):
    """
    Integration test executed against the remote Supabase project.
    Authenticates a test user using a real GoTrue ES256 session token and tests
    read-only querying of orders, deliveries, and receipts under actual RLS policies.
    Requires LIVE_SUPABASE_URL, LIVE_SUPABASE_ANON_KEY, and LIVE_TEST_USER_PASSWORD in env.
    """
    live_url = os.environ.get("LIVE_SUPABASE_URL")
    live_anon = os.environ.get("LIVE_SUPABASE_ANON_KEY")
    test_email = os.environ.get("LIVE_TEST_USER_EMAIL", "test_verify_user@statecommodities.gov")
    test_password = os.environ.get("LIVE_TEST_USER_PASSWORD")

    if not live_url or not live_anon or not test_password:
        pytest.skip("Live remote credentials not configured in environment (LIVE_SUPABASE_URL, LIVE_SUPABASE_ANON_KEY, LIVE_TEST_USER_PASSWORD).")

    try:
        anon_client = create_client(live_url, live_anon)
        session = anon_client.auth.sign_in_with_password({
            "email": test_email,
            "password": test_password,
        })
        token = session.session.access_token
    except Exception as exc:
        pytest.skip(f"Live Supabase network or authentication not available: {str(exc)}")

    # Temporarily point settings to live URL
    orig_url = settings.SUPABASE_URL
    orig_anon = settings.SUPABASE_ANON_KEY
    settings.SUPABASE_URL = live_url
    settings.SUPABASE_ANON_KEY = live_anon

    try:
        # Test 1: Fetch orders with genuine token
        resp_orders = client.get(
            "/api/v1/orders",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp_orders.status_code == 200
        orders = resp_orders.json()
        assert len(orders) >= 2
        assert any(o["order_number"] == "ORD-1001" for o in orders)

        # Test 2: Fetch deliveries with genuine token
        resp_deliv = client.get(
            "/api/v1/deliveries",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp_deliv.status_code == 200
        deliveries = resp_deliv.json()
        assert len(deliveries) >= 2
        assert any(d["delivery_number"] == "DEL-2001" for d in deliveries)

        # Test 3: Fetch receipts with genuine token
        resp_rcpt = client.get(
            "/api/v1/receipts",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp_rcpt.status_code == 200
        receipts = resp_rcpt.json()
        assert len(receipts) >= 2
        assert any(r["receipt_number"] == "RCPT-3001" for r in receipts)

    finally:
        settings.SUPABASE_URL = orig_url
        settings.SUPABASE_ANON_KEY = orig_anon
