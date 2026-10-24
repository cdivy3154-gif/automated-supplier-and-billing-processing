import time
from unittest.mock import MagicMock, patch
from cryptography.hazmat.primitives.asymmetric import ec, rsa
import jwt
from jwt import PyJWKClient
import pytest
from fastapi import APIRouter, Depends
from tests.conftest import MockSupabaseClient, create_test_token, TEST_JWT_SECRET
from app.core.config import settings
from app.core.security import decode_access_token, set_jwks_client
from app.dependencies.auth import get_current_active_user, require_roles
from app.main import app
from app.schemas.user import UserContext, UserRole

# Test router to verify require_roles dependency (prefixed with role_ to avoid pytest warning)
role_test_router = APIRouter(prefix="/role-checks")


@role_test_router.get("/admin-only")
def admin_only_endpoint(
    current_user: UserContext = Depends(require_roles(UserRole.ADMIN)),
):
    return {"message": "Welcome Admin", "user_id": current_user.id}


@role_test_router.get("/supplier-or-admin")
def supplier_or_admin_endpoint(
    current_user: UserContext = Depends(require_roles(UserRole.SUPPLIER, UserRole.ADMIN)),
):
    return {"message": "Welcome Supplier or Admin", "role": current_user.role.value}


app.include_router(role_test_router)


# ============================================================================
# Basic Token & Health Tests
# ============================================================================

def test_auth_me_missing_token(client):
    """Missing Authorization header must return 401 Unauthorized."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_auth_me_invalid_token_format(client):
    """Malformed or invalid JWT must return 401 Unauthorized."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"},
    )
    assert response.status_code == 401
    assert "Invalid authentication token" in response.json()["detail"]


def test_auth_me_expired_token(client, admin_user_data):
    """Expired JWT must return 401 Unauthorized."""
    expired_token = create_test_token(
        user_id=admin_user_data["id"],
        email=admin_user_data["email"],
        expires_in=-300,  # expired 5 minutes ago
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_auth_me_invalid_signature_hs256(client, admin_user_data):
    """Token signed with wrong HMAC key must be rejected with 401 Unauthorized."""
    tampered_token = create_test_token(
        user_id=admin_user_data["id"],
        email=admin_user_data["email"],
        secret="completely-wrong-secret-signature-key-12345",
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert response.status_code == 401
    assert "Invalid authentication token" in response.json()["detail"]


def test_auth_me_user_profile_not_found(client, admin_token):
    """Valid JWT with no matching user_profiles row must return 404."""
    empty_db = {"user_profiles": []}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(empty_db)):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


def test_auth_me_active_user_success(client, supplier_token, supplier_user_data):
    """Active user with valid JWT and profile gets 200 with profile data."""
    db = {"user_profiles": [supplier_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == supplier_user_data["id"]
        assert data["email"] == supplier_user_data["email"]
        assert data["role"] == "SUPPLIER"
        assert data["supplier_id"] == supplier_user_data["supplier_id"]
        assert data["is_active"] is True


@pytest.mark.asyncio
async def test_async_auth_me_active_user_success(async_client, supplier_token, supplier_user_data):
    """Test /api/v1/auth/me using asynchronous client."""
    db = {"user_profiles": [supplier_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == supplier_user_data["id"]


def test_auth_me_inactive_user_forbidden(client, inactive_user_token, inactive_user_data):
    """Inactive user (is_active=False) must be rejected with 403 Forbidden."""
    db = {"user_profiles": [inactive_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {inactive_user_token}"},
        )
        assert response.status_code == 403
        assert "deactivated" in response.json()["detail"].lower()


def test_auth_me_invalid_role_in_database(client, admin_token):
    """User profile having an unrecognized role value should return 400."""
    invalid_role_user = {
        "id": "a0000000-0000-0000-0000-000000000001",
        "full_name": "Invalid Role User",
        "email": "invalid@example.com",
        "role": "SUPERUSER_NOT_IN_ENUM",
        "supplier_id": None,
        "is_active": True,
    }
    db = {"user_profiles": [invalid_role_user]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 400
        assert "Invalid role" in response.json()["detail"]


# ============================================================================
# Specific Verification Checks (1 to 6)
# ============================================================================

def test_check1_jwks_url_from_trusted_server_configuration(client, admin_user_data):
    """
    Check 1: JWKS URL is constructed strictly from trusted server configuration,
    not from user-supplied token headers (such as jku, x5u) or request parameters.
    """
    priv_key = ec.generate_private_key(ec.SECP256R1())
    now = int(time.time())
    payload = {
        "sub": admin_user_data["id"],
        "email": admin_user_data["email"],
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    # User attempts to inject a malicious jku header
    malicious_header_token = jwt.encode(
        payload,
        priv_key,
        algorithm="ES256",
        headers={"kid": "attacker-kid", "jku": "https://attacker.example.com/malicious_jwks.json"},
    )

    # Server's trusted JWKS mock
    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.side_effect = Exception("Key not in server JWKS")

    with patch("app.core.security.get_jwks_client", return_value=mock_jwks):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {malicious_header_token}"},
        )
        assert response.status_code == 401
        # Proves the server queried its own JWKS client and did not follow the attacker's jku
        mock_jwks.get_signing_key_from_jwt.assert_called_once()


def test_check2_kid_matches_trusted_jwks_and_key_compatibility(client, admin_user_data):
    """
    Check 2: Token's kid matches a trusted JWKS key, and key is compatible with algorithm.
    An algorithm confusion attempt (RSA key provided for ES256) is blocked.
    """
    rsa_priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = int(time.time())
    payload = {
        "sub": admin_user_data["id"],
        "email": admin_user_data["email"],
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    # Token claiming to be ES256
    token = jwt.encode(payload, "secret-dummy-32-bytes-minimum-length-for-hmac", algorithm="HS256")
    # Header modified to ES256 with kid
    parts = token.split(".")
    import base64, json
    h = json.loads(base64.urlsafe_b64decode(parts[0] + "=="))
    h["alg"] = "ES256"
    h["kid"] = "rsa-key-kid"
    new_h = base64.urlsafe_b64encode(json.dumps(h).encode()).decode().rstrip("=")
    mismatched_token = f"{new_h}.{parts[1]}.{parts[2]}"

    # JWKS returns an RSA key instead of EC key
    mock_signing_key = MagicMock()
    mock_signing_key.key = rsa_priv.public_key()
    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_signing_key

    with patch("app.core.security.get_jwks_client", return_value=mock_jwks):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {mismatched_token}"},
        )
        assert response.status_code == 401
        assert "incompatible" in response.json()["detail"].lower()


def test_check3_verifier_validates_required_claims(client, admin_user_data):
    """
    Check 3: Verifier strictly validates expiration ('exp'), subject ('sub'), and audience ('aud').
    Missing exp, missing sub, or anon tokens are rejected.
    """
    now = int(time.time())
    
    # 3a. Missing 'exp' claim
    token_no_exp = jwt.encode(
        {"sub": admin_user_data["id"], "aud": "authenticated"},
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    r1 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_no_exp}"})
    assert r1.status_code == 401
    assert "missing required claim" in r1.json()["detail"].lower()

    # 3b. Missing 'sub' claim
    token_no_sub = jwt.encode(
        {"aud": "authenticated", "exp": now + 3600},
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    r2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_no_sub}"})
    assert r2.status_code == 401
    assert "missing required claim" in r2.json()["detail"].lower()

    # 3c. Anon token (aud="anon") cannot access user profile
    token_anon = jwt.encode(
        {"sub": admin_user_data["id"], "aud": "anon", "role": "anon", "exp": now + 3600},
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    r3 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_anon}"})
    assert r3.status_code == 401
    assert "anonymous tokens" in r3.json()["detail"].lower()


def test_check4_jwks_endpoint_unavailable_fails_closed(client, admin_user_data):
    """
    Check 4: If JWKS endpoint is unavailable and no valid cached key is available,
    authentication fails closed with HTTP 401 Unauthorized.
    """
    priv_key = ec.generate_private_key(ec.SECP256R1())
    now = int(time.time())
    payload = {
        "sub": admin_user_data["id"],
        "email": admin_user_data["email"],
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    token = jwt.encode(payload, priv_key, algorithm="ES256", headers={"kid": "some-kid"})

    # Unreachable JWKS client with cache disabled
    unreachable_jwks = PyJWKClient("https://127.0.0.1:59999/unreachable/jwks.json", cache_keys=False)
    set_jwks_client(unreachable_jwks)

    try:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401
        assert "failed to resolve public signing key" in response.json()["detail"].lower()
    finally:
        set_jwks_client(None)  # Reset


def test_check5_genuine_es256_token_authenticates_test_user(client, admin_user_data):
    """
    Check 5: A genuine access token with ES256 signature and matching JWKS key
    successfully authenticates the test user and returns their profile.
    """
    priv_key = ec.generate_private_key(ec.SECP256R1())
    now = int(time.time())
    payload = {
        "sub": admin_user_data["id"],
        "email": admin_user_data["email"],
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "iss": "supabase",
    }
    es256_token = jwt.encode(payload, priv_key, algorithm="ES256", headers={"kid": "genuine-project-kid"})

    mock_signing_key = MagicMock()
    mock_signing_key.key = priv_key.public_key()
    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_signing_key

    db = {"user_profiles": [admin_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)), \
         patch("app.core.security.get_jwks_client", return_value=mock_jwks):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {es256_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == admin_user_data["id"]
        assert data["email"] == admin_user_data["email"]
        assert data["role"] == "ADMIN"
        assert data["is_active"] is True


def test_check6_modified_signature_rejected_by_api(client, admin_user_data):
    """
    Check 6: A token with a modified signature is rejected by the running API with 401.
    """
    priv_key = ec.generate_private_key(ec.SECP256R1())
    now = int(time.time())
    payload = {
        "sub": admin_user_data["id"],
        "email": admin_user_data["email"],
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    valid_token = jwt.encode(payload, priv_key, algorithm="ES256", headers={"kid": "valid-kid"})

    # Tamper with the signature bytes (last segment of JWT)
    parts = valid_token.split(".")
    tampered_sig = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"

    mock_signing_key = MagicMock()
    mock_signing_key.key = priv_key.public_key()
    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_signing_key

    with patch("app.core.security.get_jwks_client", return_value=mock_jwks):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )
        assert response.status_code == 401
        assert "Invalid token signature" in response.json()["detail"]


# ============================================================================
# Role-based Access Control Tests
# ============================================================================

def test_role_authorization_admin_allowed(client, admin_token, admin_user_data):
    """ADMIN role should be granted access to admin-only endpoint."""
    db = {"user_profiles": [admin_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = client.get(
            "/role-checks/admin-only",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome Admin"


def test_role_authorization_supplier_forbidden_on_admin_endpoint(client, supplier_token, supplier_user_data):
    """SUPPLIER role must be rejected with 403 Forbidden on admin-only endpoint."""
    db = {"user_profiles": [supplier_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = client.get(
            "/role-checks/admin-only",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 403
        assert "Access forbidden" in response.json()["detail"]
        assert "ADMIN" in response.json()["detail"]


def test_role_authorization_multi_role_endpoint(client, supplier_token, supplier_user_data):
    """Endpoint allowing SUPPLIER or ADMIN should succeed for SUPPLIER."""
    db = {"user_profiles": [supplier_user_data]}
    with patch("app.dependencies.auth.get_supabase_user_client", return_value=MockSupabaseClient(db)):
        response = client.get(
            "/role-checks/supplier-or-admin",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "SUPPLIER"
