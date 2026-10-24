# Automated Supplier and Billing Processing - Backend (Phase 2A, 2B & 2C)

FastAPI-based backend service for the **Automated State Commodity Supplier Billing and Payment Processing** system.

This service connects to the Supabase PostgreSQL database and provides authentication verification, role-based access control, health monitoring, and core business APIs for Suppliers, Supply Orders, Physical Deliveries, Digital Delivery Receipts, Commercial Billing, Multi-Stage Approval Workflow, and Simulated Payment Processing.

---

## Architecture & Technology Stack

- **Framework**: Python 3.11+, [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Validation & Settings**: [Pydantic V2](https://docs.pydantic.dev/) and `pydantic-settings`
- **Database Client**: [Supabase Python Client](https://github.com/supabase-community/supabase-py)
- **Token Verification**: [PyJWT](https://pyjwt.readthedocs.io/) with `cryptography` and `certifi` (supporting both asymmetric `ES256`/`RS256` via JWKS and symmetric `HS256` via secret)
- **Financial Calculations**: Standard library `decimal.Decimal` with explicit rounding to prevent floating-point inaccuracies
- **Test Suite**: [pytest](https://docs.pytest.org/), `pytest-asyncio`, and `httpx`

---

## JWT Signing Algorithm & Verification

### What Algorithm Does This Project Use?
1. **Production & Remote Supabase Project**:
   - The Supabase project signs tokens using **`ES256`** (ECDSA with NIST P-256 curve and SHA-256).
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
│   │           ├── approvals.py    # /api/v1/approvals (Multi-stage review workflow)
│   │           ├── auth.py         # /api/v1/auth/me
│   │           ├── bills.py        # /api/v1/bills
│   │           ├── deliveries.py   # /api/v1/deliveries
│   │           ├── health.py       # /api/v1/health & database ping
│   │           ├── orders.py       # /api/v1/orders
│   │           ├── payments.py     # /api/v1/payments (Simulated payment processing)
│   │           ├── receipts.py     # /api/v1/receipts
│   │           └── suppliers.py    # /api/v1/suppliers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic BaseSettings configuration
│   │   └── security.py             # Supabase JWT decoding and verification (ES256/HS256)
│   ├── dependencies/
│   │   ├── __init__.py
│   │   ├── auth.py                 # get_current_user, active checks, require_roles
│   │   └── db.py                   # get_user_db (RLS enforced) & get_admin_db
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                 # Auth schemas and token claims
│   │   ├── bill.py                 # Bill and bill delivery schemas
│   │   ├── delivery.py             # Delivery schemas
│   │   ├── health.py               # Health & database response schemas
│   │   ├── order.py                # Supply order schemas
│   │   ├── payment.py              # Payment schemas
│   │   ├── receipt.py              # Delivery receipt schemas
│   │   ├── supplier.py             # Supplier schemas
│   │   ├── user.py                 # UserRole enum, UserProfile, UserContext
│   │   └── workflow.py             # Workflow tasks and approval schemas
│   └── services/
│       ├── __init__.py
│       └── supabase.py             # Client factories (Anon, User RLS, Admin)
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Pytest fixtures and mock client
│   ├── test_approvals.py           # Multi-stage workflow approval/rejection tests
│   ├── test_auth.py                # Authentication and security verification tests
│   ├── test_bills.py               # Billing API and calculation tests
│   ├── test_concurrency_and_security_review.py  # Concurrency & race condition review tests
│   ├── test_config.py              # Configuration parsing tests
│   ├── test_deliveries.py          # Delivery recording and rule tests
│   ├── test_health.py              # Health check tests
│   ├── test_integration_remote.py  # Live remote Supabase integration tests
│   ├── test_orders.py              # Supply order creation and access tests
│   ├── test_payments.py            # Simulated payment initiation & callback tests
│   ├── test_receipts.py            # Receipt issuance and eligibility tests
│   ├── test_remediation_phase2b.py # Phase 2B remediation scenarios (SEC-01 - SEC-04)
│   └── test_suppliers.py           # Supplier isolation and profile tests
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore patterns
├── pytest.ini                      # Pytest runner configuration
├── requirements.txt                # Production and development dependencies
└── README.md                       # Documentation
```

---

## Setup & Installation

### 1. Virtual Environment

```bash
# From repository root:
source .asbp/bin/activate
```

If initializing a fresh environment:
```bash
python3 -m venv .asbp
source .asbp/bin/activate
pip install -r backend/requirements.txt
```

### 2. Environment Variables

Create `backend/.env` by copying `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```

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
| `SUPABASE_JWKS_URL` | Explicit JWKS URL (auto-derived from `SUPABASE_URL`) | `https://<your-project>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_SECRET` | Secret used to verify HS256 tokens in local/test environments | `<your-jwt-secret>` |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `http://localhost:3000,http://localhost:5173` |

---

## Running the Application

```bash
cd backend
../.asbp/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running:
- **Interactive OpenAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Root Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## API Endpoints (Phase 2B)

All business endpoints require a valid Supabase JWT Bearer token:
`Authorization: Bearer <token>`

### 1. Supplier APIs (`/api/v1/suppliers`)

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/suppliers/me` | `SUPPLIER` | Retrieve the authenticated user's supplier organization profile. |
| `GET` | `/api/v1/suppliers/{supplier_id}` | Staff (`ADMIN`, `BRANCH_OFFICER`, `GODOWN_MANAGER`, `FINANCE_OFFICER`, `PRE_AUDITOR`, `GENERAL_MANAGER`) OR matching `SUPPLIER` | Retrieve supplier details. Suppliers attempting to view another supplier receive `403 Forbidden`. |

### 2. Supply Order APIs (`/api/v1/orders`)

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orders` | Staff OR `SUPPLIER` | List orders. Suppliers are automatically isolated to their own supplier ID. Optional filters: `supplier_id`, `godown_id`, `status`. |
| `GET` | `/api/v1/orders/{order_id}` | Staff OR matching `SUPPLIER` | Retrieve specific order details. |
| `POST` | `/api/v1/orders` | `ADMIN`, `BRANCH_OFFICER` | Create a new procurement supply order for verified suppliers and godowns. |

**Example Request (`POST /api/v1/orders`)**:
```json
{
  "supplier_id": "770a7fa5-a62a-4f92-80de-75612272ae96",
  "godown_id": "2a672dbd-b83b-4565-9f8c-7669fbdfdc66",
  "commodity_name": "Wheat Grade-A",
  "ordered_quantity": 1000.0,
  "unit": "MT",
  "agreed_rate": 25.50,
  "order_date": "2026-10-24",
  "status": "AUTHORIZED"
}
```

### 3. Delivery APIs (`/api/v1/deliveries`)

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/deliveries` | Staff OR `SUPPLIER` | List deliveries. Suppliers only see deliveries linked to their own supply orders. |
| `GET` | `/api/v1/deliveries/{delivery_id}` | Staff OR matching `SUPPLIER` | Retrieve specific delivery record. |
| `POST` | `/api/v1/deliveries` | `ADMIN`, `GODOWN_MANAGER` | Record and verify physical arrival at godown. Automatically binds `verified_by` to the authenticated godown manager and enforces that cumulative deliveries do not exceed ordered quantities. |

**Example Request (`POST /api/v1/deliveries`)**:
```json
{
  "supply_order_id": "5feed761-297e-4789-a082-55e13e7055be",
  "delivered_quantity": 400.0,
  "delivery_date": "2026-10-24",
  "status": "DELIVERED"
}
```

### 4. Digital Delivery Receipts (`/api/v1/receipts`)

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/receipts` | Staff OR `SUPPLIER` | List delivery receipts. Suppliers only see receipts for their own deliveries. |
| `GET` | `/api/v1/receipts/{receipt_id}` | Staff OR matching `SUPPLIER` | Retrieve specific receipt record. |
| `POST` | `/api/v1/receipts` | `ADMIN`, `GODOWN_MANAGER` | Issue digital delivery receipt for a verified delivery. Requires delivery to have `status == 'DELIVERED'` and `verified_by`. Rejects duplicate receipts for the same delivery with `409 Conflict`. |

**Example Request (`POST /api/v1/receipts`)**:
```json
{
  "delivery_id": "bee40ea4-bbcb-4692-b3af-cafe9ac67dc4",
  "receipt_reference": "WB-88123"
}
```

### 5. Billing APIs (`/api/v1/bills`)

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/bills` | Staff OR `SUPPLIER` | List submitted bills. Suppliers only see bills for their own organization. |
| `GET` | `/api/v1/bills/{bill_id}` | Staff OR matching `SUPPLIER` | Retrieve bill details and associated delivery line items. |
| `POST` | `/api/v1/bills` | `SUPPLIER`, `ADMIN`, `FINANCE_OFFICER` | Submit commercial invoice against verified deliveries. |

**Important Security & Calculation Rules for Billing**:
1. **Server-Derived Identity**: For supplier callers, `supplier_id` is derived strictly from the authenticated user profile (`current_user.supplier_id`); client-supplied IDs are never trusted.
2. **Eligibility Verification**: Every referenced delivery must:
   - Belong to the supplier.
   - Have `status == 'DELIVERED'`.
   - Have an issued receipt in `public.delivery_receipts`.
   - Not already be associated with an existing bill (`409 Conflict`).
3. **Decimal Arithmetic**: Line amounts (`billed_quantity * rate`) and totals are computed strictly on the server using `decimal.Decimal` with 2-decimal-place rounding (`ROUND_HALF_UP`). Client-provided totals are ignored.
4. **Consistency**: Bill header and `bill_deliveries` junction rows are created consistently; if line insertion fails, the bill header is cleaned up immediately.

**Example Request (`POST /api/v1/bills`)**:
```json
{
  "invoice_number": "INV-2026-001",
  "invoice_date": "2026-10-24",
  "delivery_items": [
    {
      "delivery_id": "bee40ea4-bbcb-4692-b3af-cafe9ac67dc4",
      "billed_quantity": 400.0
    }
  ]
}
```

**Example Response (`201 Created`)**:
```json
{
  "id": "73e57645-ee07-4b3f-944c-643b4f0e8375",
  "bill_number": "BILL-20261024-C3A91F",
  "supplier_id": "770a7fa5-a62a-4f92-80de-75612272ae96",
  "invoice_number": "INV-2026-001",
  "invoice_date": "2026-10-24",
  "total_amount": 10200.0,
  "status": "SUBMITTED",
  "submitted_by": "8b8e729d-399c-488e-85b7-26bfffbe5a13",
  "submitted_at": "2026-10-24T15:30:00Z",
  "items": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "bill_id": "73e57645-ee07-4b3f-944c-643b4f0e8375",
      "delivery_id": "bee40ea4-bbcb-4692-b3af-cafe9ac67dc4",
      "billed_quantity": 400.0,
      "rate": 25.50,
      "amount": 10200.0,
      "created_at": "2026-10-24T15:30:00Z"
    }
  ]
}
```

---

### 6. Approval Workflow APIs (`/api/v1/approvals`)

The multi-stage approval pipeline enforces strict sequential verification across departmental authorities:

```
[SUBMITTED]
     │
     ▼ (Branch Officer reviews)
[BRANCH_APPROVED]
     │
     ▼ (Pre-Auditor verifies calculations)
[PRE_AUDITED]
     │
     ▼ (General Manager executive approval)
[GM_APPROVED]
     │
     ▼ (Finance Officer final clearance)
[APPROVED] ──► Ready for simulated payment
```

*If any stage officer rejects the bill, status transitions to `REJECTED`, non-empty comments are required, and the workflow stops permanently.*

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/approvals/tasks/pending` | Staff (`BRANCH_OFFICER`, `PRE_AUDITOR`, `GENERAL_MANAGER`, `FINANCE_OFFICER`, `ADMIN`) | Retrieve pending tasks assigned to the caller's role. Admins see all pending tasks. |
| `GET` | `/api/v1/approvals/tasks/{task_id}` | Assigned Officer Role OR `ADMIN` | Retrieve details of a specific workflow task. |
| `POST` | `/api/v1/approvals` | Assigned Officer Role OR `ADMIN` | Record approval or rejection decision. Executes atomically via `process_approval_atomic` RPC with row-level locks. |
| `GET` | `/api/v1/approvals/bills/{bill_id}/workflow` | Staff OR matching `SUPPLIER` | Retrieve full workflow progression, timeline, officer decisions, and rejection reasons. Suppliers only see their own bills. |

**Example Approval Submission (`POST /api/v1/approvals`)**:
```json
{
  "workflow_task_id": "f0000000-0000-0000-0000-000000000010",
  "decision": "APPROVED",
  "comments": "Physical commodity quality and weight verified against godown logs."
}
```

---

### 7. Simulated Payment Processing APIs (`/api/v1/payments`)

Simulates banking and treasury disbursement without connecting to real money-movement rails or external gateways.

| Method | Endpoint | Permitted Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments` | `ADMIN`, `FINANCE_OFFICER` | Initiate simulated payment for a finance-cleared (`APPROVED` or `PAYMENT_FAILED`) bill. Amount is derived strictly from `bill.total_amount`. Fully idempotent. |
| `GET` | `/api/v1/payments` | Staff OR `SUPPLIER` | List payment records. Filterable by `bill_id` or `status`. Suppliers only see payments for their own bills. |
| `GET` | `/api/v1/payments/{payment_id}` | Staff OR matching `SUPPLIER` | Retrieve details of a specific payment record. |
| `GET` | `/api/v1/payments/bills/{bill_id}/payment` | Staff OR matching `SUPPLIER` | Retrieve the latest payment record associated with a bill. |
| `POST` | `/api/v1/payments/{payment_id}/simulate-status` | `ADMIN`, `FINANCE_OFFICER` | Simulate asynchronous payment gateway callback (`SUCCESS` or `FAILED`). |

**Simulated Payment State Transitions**:
1. `POST /api/v1/payments`: Bill in `APPROVED` -> Payment created (`INITIATED`), Bill transitions to `PAYMENT_PENDING`.
2. `POST /api/v1/payments/{payment_id}/simulate-status` with `target_status="SUCCESS"`: Payment becomes `SUCCESS`, confirmed timestamp recorded, Bill transitions to `PAID`.
3. `POST /api/v1/payments/{payment_id}/simulate-status` with `target_status="FAILED"`: Payment becomes `FAILED`, Bill transitions to `PAYMENT_FAILED`. Finance Officer can initiate retry via `POST /api/v1/payments`.

**Example Payment Initiation (`POST /api/v1/payments`)**:
```json
{
  "bill_id": "73e57645-ee07-4b3f-944c-643b4f0e8375"
}
```

**Example Gateway Status Simulation (`POST /api/v1/payments/{payment_id}/simulate-status`)**:
```json
{
  "target_status": "SUCCESS"
}
```

Standardized error responses follow the FastAPI format:
```json
{
  "detail": "Description of error"
}
```

| HTTP Status | Trigger Conditions |
| :--- | :--- |
| `400 Bad Request` | Quantity exceeds delivered limit; unverified delivery receipt attempt; invalid business logic. |
| `401 Unauthorized` | Missing, expired, or invalid JWT signature; anonymous tokens accessing user endpoints. |
| `403 Forbidden` | Supplier querying other suppliers' data; insufficient role permissions; deactivated user account. |
| `404 Not Found` | Referenced supplier, order, delivery, or receipt not found. |
| `409 Conflict` | Duplicate invoice number for supplier (`uq_supplier_invoice`); duplicate delivery receipt; double-billed delivery. |
| `422 Unprocessable Entity` | Pydantic schema validation failures (e.g., negative quantities or missing required fields). |

---

## Frontend Integration Guide

A dedicated, comprehensive integration guide for frontend engineers is provided in [FRONTEND_INTEGRATION.md](file:///Users/nishantchaudhari/Desktop/automated-supplier-and-billing-processing/backend/FRONTEND_INTEGRATION.md).

It covers:
- Local startup commands and interactive API documentation.
- Supabase Auth session management and Bearer token handling.
- Role-based access control (RBAC) matrix and tenant isolation.
- Complete error envelopes and HTTP status code mappings.
- Permitted CORS development origins (`http://localhost:3000`, `5173`, `5500`, `8080`).
- Copy-paste ready JavaScript API client wrapper (`src/api/client.js`) and example operations.

---

## Running Automated Tests

Run the full pytest suite (106 tests covering authentication, billing, delivery rules, concurrency safety, multi-stage approvals, stage skipping prevention, simulated payments, and API contracts):

```bash
cd /Users/nishantchaudhari/Desktop/automated-supplier-and-billing-processing
.asbp/bin/pytest backend -v
```

To run API contract validation tests specifically:
```bash
.asbp/bin/pytest backend/tests/test_api_contracts.py -v
```

To run workflow approval and payment tests specifically:
```bash
.asbp/bin/pytest backend/tests/test_approvals.py backend/tests/test_payments.py -v
```

To run only unit tests (offline):
```bash
.asbp/bin/pytest backend -v -m "not integration"
```

To run the live remote Supabase integration test:
```bash
.asbp/bin/pytest backend/tests/test_integration_remote.py -v
```
