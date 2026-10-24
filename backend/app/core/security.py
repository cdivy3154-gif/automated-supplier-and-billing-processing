import ssl
import time
from typing import Any, Dict, Optional
import certifi
from cryptography.hazmat.primitives.asymmetric import ec, rsa
import jwt
from jwt import PyJWKClient
from jwt.exceptions import (
    ExpiredSignatureError,
    InvalidSignatureError,
    InvalidTokenError,
    MissingRequiredClaimError,
    PyJWKClientError,
    PyJWTError,
)
from app.core.config import settings

_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> PyJWKClient:
    """
    Get or initialize the shared PyJWKClient for fetching Supabase asymmetric public keys (ES256/RS256).
    The JWKS URL is constructed strictly from trusted server-side Supabase configuration.
    Uses certifi CA bundle for secure SSL certificate verification.
    """
    global _jwks_client
    if _jwks_client is None:
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        _jwks_client = PyJWKClient(
            uri=settings.jwks_url,
            ssl_context=ssl_context,
            cache_keys=True,
            max_cached_keys=16,
            lifespan=3600,
        )
    return _jwks_client


def set_jwks_client(client: Optional[PyJWKClient]) -> None:
    """Allow injecting or resetting the JWKS client (primarily for testing and mock isolation)."""
    global _jwks_client
    _jwks_client = client


def decode_access_token(
    token: str,
    jwks_client: Optional[PyJWKClient] = None,
) -> Dict[str, Any]:
    """
    Decode and cryptographically verify a Supabase JWT access token.
    
    Security Controls:
    1. JWKS URL is strictly obtained from trusted server configuration (never user input).
    2. Token 'kid' must match a trusted JWKS key, and the key type must match the algorithm.
    3. Expiration ('exp') and Subject ('sub') are strictly required and validated.
    4. If JWKS is unavailable and no cached key is available, fails closed.
    5. Signature verification is ALWAYS enforced (verify_signature=True).
    
    Raises:
        ExpiredSignatureError: When the token exp timestamp is in the past.
        InvalidTokenError: When the signature is invalid, claims are missing, or key cannot be resolved.
    """
    if not token or not isinstance(token, str):
        raise InvalidTokenError("Authentication token is required")

    # 1. Inspect unverified header to determine signing algorithm and key ID
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise InvalidTokenError(f"Malformed authentication token: {str(exc)}") from exc

    alg = unverified_header.get("alg")
    if not alg:
        raise InvalidTokenError("Authentication token missing 'alg' in header")

    # 2. Asymmetric Verification (ES256 / RS256 - used by Supabase Auth)
    if alg in ("ES256", "RS256"):
        active_jwks = jwks_client or get_jwks_client()
        
        # Match 'kid' against trusted server-side JWKS keys
        try:
            signing_key = active_jwks.get_signing_key_from_jwt(token)
            key = signing_key.key
        except (PyJWKClientError, Exception) as exc:
            # Fails closed if JWKS is unreachable or kid does not match
            raise InvalidTokenError(
                f"Failed to resolve public signing key for algorithm '{alg}': {str(exc)}"
            ) from exc

        # Verify key compatibility with algorithm
        if alg == "ES256" and not isinstance(key, ec.EllipticCurvePublicKey):
            raise InvalidTokenError(
                f"Signing key type '{type(key).__name__}' is incompatible with requested algorithm 'ES256' (requires EC key)"
            )
        elif alg == "RS256" and not isinstance(key, rsa.RSAPublicKey):
            raise InvalidTokenError(
                f"Signing key type '{type(key).__name__}' is incompatible with requested algorithm 'RS256' (requires RSA key)"
            )

        # Cryptographically verify signature and required claims
        try:
            payload = jwt.decode(
                token,
                key=key,
                algorithms=[alg],
                audience=["authenticated", "anon"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "require": ["exp", "sub"],
                },
            )
            return payload
        except ExpiredSignatureError:
            raise
        except InvalidSignatureError as exc:
            raise InvalidTokenError(f"Invalid token signature for algorithm '{alg}'") from exc
        except MissingRequiredClaimError as exc:
            raise InvalidTokenError(f"Token missing required claim: {str(exc)}") from exc
        except (PyJWTError, TypeError, ValueError) as exc:
            raise InvalidTokenError(f"Token validation failed: {str(exc)}") from exc

    # 3. Symmetric Verification (HS256 - used in test / local development environments)
    elif alg == "HS256":
        jwt_secret = settings.SUPABASE_JWT_SECRET
        if not jwt_secret or not jwt_secret.strip() or jwt_secret == "your-supabase-jwt-secret-here":
            raise InvalidTokenError(
                "Server is not configured with SUPABASE_JWT_SECRET to verify HS256 token signatures"
            )

        try:
            payload = jwt.decode(
                token,
                key=jwt_secret,
                algorithms=["HS256"],
                audience=["authenticated", "anon"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "require": ["exp", "sub"],
                },
            )
            return payload
        except ExpiredSignatureError:
            raise
        except InvalidSignatureError as exc:
            raise InvalidTokenError("Invalid token signature for algorithm 'HS256'") from exc
        except MissingRequiredClaimError as exc:
            raise InvalidTokenError(f"Token missing required claim: {str(exc)}") from exc
        except (PyJWTError, TypeError, ValueError) as exc:
            raise InvalidTokenError(f"Token validation failed: {str(exc)}") from exc

    # 4. Any other or unsupported algorithm (including 'none') is strictly rejected
    else:
        raise InvalidTokenError(
            f"Unsupported token signing algorithm: '{alg}'. Only 'ES256', 'RS256', and 'HS256' are permitted."
        )


def create_mock_access_token(
    user_id: str,
    email: str,
    role: str = "SUPPLIER",
    expires_in_seconds: int = 3600,
    secret: Optional[str] = None,
    algorithm: str = "HS256",
    private_key: Optional[Any] = None,
    headers: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a signed JWT access token for testing and local development.
    Supports both HS256 (with symmetric secret) and ES256 (with EC private key).
    """
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "app_role": role,
        "iat": now,
        "exp": now + expires_in_seconds,
        "aud": "authenticated",
        "iss": "supabase",
    }
    
    if algorithm == "ES256":
        if not private_key:
            raise ValueError("private_key is required when signing with ES256")
        return jwt.encode(payload, private_key, algorithm="ES256", headers=headers or {})
    else:
        key = secret or settings.SUPABASE_JWT_SECRET or "test-secret-key-for-unit-testing-only"
        return jwt.encode(payload, key, algorithm="HS256", headers=headers or {})
