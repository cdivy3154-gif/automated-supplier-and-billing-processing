# Automated Supplier and Billing Processing - Backend (Phase 2A)

FastAPI-based backend service for the **Automated State Commodity Supplier Billing and Payment Processing** system.

This service connects to the Supabase PostgreSQL database (configured in Phase 1) and provides authentication verification, role-based access control, health monitoring, and a modular architecture for subsequent workflow phases (Phase 2B+).

---

## Architecture & Technology Stack

- **Framework**: Python 3.11+, [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Validation & Settings**: [Pydantic V2](https://docs.pydantic.dev/) and `pydantic-settings`
- **Database Client**: [Supabase Python Client](https://github.com/supabase-community/supabase-py)
- **Token Verification**: [PyJWT](https://pyjwt.readthedocs.io/) with `cryptography` and `certifi` (supporting both asymmetric `ES256`/`RS256` via JWKS and symmetric `HS256` via secret)
- **Test Suite**: [pytest](https://docs.pytest.org/), `pytest-asyncio`, and `httpx`

---

## JWT Signing Algorithm & Verification

### What Algorithm Does This Project Use?
1. **Production & Remote Supabase Project**:
   - The Supabase project (`https://<project-ref>.supabase.co`) signs tokens using **`ES256`** (ECDSA with NIST P-256 curve and SHA-256).
   - Public keys are dynamically fetched and cached from the project's standard JWKS endpoint:
     `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
2. **Local Testing & HMAC Development**:
   - For offline test suites and HMAC-based local development, tokens signed with **`HS256`** (HMAC-SHA256) are supported using `SUPABASE_JWT_SECRET`.

### Strict Signature Verification Rules:
- **Never Disable Verification**: Signature verification is strictly enforced (`verify_signature=True`) on every request. There is no code path or environment that bypasses cryptographic signature verification.
- **Algorithm Enforcement**: Tokens with `alg: "none"` or unsupported algorithms (e.g., `HS512`) are rejected immediately with `401 Unauthorized`.
- **Missing Keys Fail Closed**: If an `HS256` token arrives but `SUPABASE_JWT_SECRET` is not configured, or if an `ES256` token's public key cannot be verified against JWKS, the request fails with `401 Unauthorized`.

---

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app factory, CORS, and root routes
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── api.py              # Router aggregation for API v1
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── auth.py         # /api/v1/auth/me endpoint
│   │           └── health.py       # /api/v1/health and database connectivity
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic BaseSettings configuration
│   │   └── security.py             # Supabase JWT decoding and verification (ES256/HS256)
│   ├── dependencies/
│   │   ├── __init__.py
│   │   └── auth.py                 # get_current_user, active checks, require_roles
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                 # Auth schemas and token claims
│   │   ├── health.py               # Health & database response schemas
│   │   └── user.py                 # UserRole enum, UserProfile, UserContext
│   └── services/
│       ├── __init__.py
│       └── supabase.py             # Client factories (Anon, User RLS, Admin)
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Pytest fixtures and mock client
│   ├── test_auth.py                # Authentication, ES256/HS256 signature, and RBAC tests
│   ├── test_config.py              # Configuration and parsing tests
│   └── test_health.py              # Health check and DB ping tests
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore patterns
├── pytest.ini                      # Pytest runner configuration
├── requirements.txt                # Production and development dependencies
└── README.md                       # Documentation
```

---

## Setup & Installation

### 1. Virtual Environment

The project uses the existing virtual environment located at `.asbp` in the repository root:

```bash
# From the repository root:
source .asbp/bin/activate
```

If initializing a fresh environment:

```bash
python3 -m venv .asbp
source .asbp/bin/activate
pip install -r backend/requirements.txt
```

### 2. Environment Variables

Create `.env` inside `backend/` or at the repository root by copying `.env.example`:

```bash
cp backend/.env.example backend/.env
```

Configure the following variables in `backend/.env`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Deployment environment (`development`, `staging`, `production`) | `development` |
| `PROJECT_NAME` | Project display name | `Automated Supplier and Billing Processing API` |
| `API_V1_STR` | Base prefix for API v1 routes | `/api/v1` |
| `HOST` | Bind host address | `0.0.0.0` |
| `PORT` | Bind port number | `8000` |
| `SUPABASE_URL` | Supabase project URL | `https://<your-project>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous public key | `<your-anon-key>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (*restricted server use only*) | `<your-service-role-key>` |
| `SUPABASE_JWKS_URL` | Optional explicit JWKS URL (auto-derived from `SUPABASE_URL`) | `https://<your-project>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_SECRET` | Secret used to verify HS256 tokens in local/test environments | `<your-jwt-secret>` |
| `ALLOWED_ORIGINS` | Permitted CORS origins (comma-separated or JSON list) | `http://localhost:3000,http://localhost:5173` |

---

## Running the Application

Activate the virtual environment and launch Uvicorn:

```bash
cd backend
../.asbp/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running:
- **Interactive OpenAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Root Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## API Endpoints (Phase 2A)

### 1. Health Endpoints

- **`GET /health`**
  - Lightweight operational check for load balancers.
  - Returns `{"status": "ok", "environment": "...", "timestamp": "..."}`.
- **`GET /api/v1/health`**
  - API v1 scoped health probe.
- **`GET /api/v1/health/database`**
  - Performs an active ping to the Supabase database.
  - Returns `200 OK` when reachable, or `503 Service Unavailable` if database connectivity is broken.

### 2. Authentication & Authorization

- **`GET /api/v1/auth/me`**
  - **Headers**: `Authorization: Bearer <token>`
  - Decodes and validates the Supabase JWT cryptographically.
  - Retrieves the user's profile from `public.user_profiles` under RLS.
  - Returns `401 Unauthorized` for missing, expired, or invalid tokens / signatures.
  - Returns `403 Forbidden` if the user's `is_active` status is `false`.

---

## Running Automated Tests

The test suite is fully isolated and does not depend on an external internet connection or live database:

```bash
cd /Users/nishantchaudhari/Desktop/automated-supplier-and-billing-processing
.asbp/bin/pytest backend -v
```

Test coverage includes:
- Asymmetric `ES256` signature verification and bad key / signature rejection (`test_auth.py`).
- Symmetric `HS256` signature verification and missing secret rejection (`test_auth.py`).
- Strict rejection of `alg: "none"` and unsupported algorithms (`test_auth.py`).
- Active vs. deactivated user checks (`test_auth.py`).
- Role-based authorization enforcement (`test_auth.py`).
- Database connectivity success and failure (503) scenarios (`test_health.py`).
- Root and API v1 health checks (`test_health.py`).
- Environment variable and CORS origins parsing (`test_config.py`).
