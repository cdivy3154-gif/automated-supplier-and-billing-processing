# Frontend Integration Guide

**Project**: Automated State Commodity Supplier Billing and Payment Processing  
**Backend Framework**: FastAPI (Python 3.11+)  
**Base URL**: `http://localhost:8000`  
**API V1 Prefix**: `/api/v1`  
**Interactive API Documentation**:
* Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
* ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* OpenAPI Schema: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 1. Quick Local Backend Startup

To start the backend locally for frontend testing:

```bash
# 1. Activate project virtual environment from repository root:
source .asbp/bin/activate

# 2. Navigate to backend directory:
cd backend

# 3. Ensure local .env exists (copy template if needed):
# cp .env.example .env

# 4. Start Uvicorn development server:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend health in browser or terminal:
```bash
curl http://localhost:8000/health
# Response: {"status":"ok","environment":"development",...}
```

---

## 2. Authentication & Session Handling

### Authentication Architecture
* The backend does **not** manage raw passwords or user signups directly. Authentication is handled via **Supabase Auth** on the frontend.
* The frontend signs in using the Supabase JavaScript client:
  ```javascript
  import { createClient } from '@supabase/supabase-js';

  // Use only public anon key in frontend; NEVER expose service-role key!
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'supplier@agrocommodity.com',
    password: 'securePassword123'
  });
  const accessToken = data.session.access_token;
  ```

### Passing the Token to Backend APIs
Every protected backend endpoint requires the JWT passed in the standard `Authorization` header:
```http
Authorization: Bearer <supabase_access_token>
```

### Handling Token Expiration & Refresh
* Supabase access tokens expire after 1 hour by default.
* The frontend should use `supabase.auth.onAuthStateChange` or `supabase.auth.getSession()` to maintain an active token.
* If the backend returns `401 Unauthorized`, prompt the user to re-authenticate or refresh their Supabase session before retrying:
  ```javascript
  const { data: { session } } = await supabase.auth.refreshSession();
  const refreshedToken = session?.access_token;
  ```

---

## 3. Role-Based Access Control (RBAC)

The backend strictly enforces role permissions on every API request. **Never rely on frontend UI hiding for security.** The backend is the authoritative security boundary.

| Role | Primary User Persona | Permitted Backend Actions |
| :--- | :--- | :--- |
| `SUPPLIER` | Commodity Supplier Organization | View own profile; view own orders, deliveries, and receipts; submit commercial bills; view own workflow progress and rejection reasons; view own payment status. |
| `GODOWN_MANAGER` | Godown / Warehouse Staff | View godowns and orders; record physical delivery arrival (`POST /deliveries`); issue digital delivery receipts (`POST /receipts`). |
| `BRANCH_OFFICER` | Procurement Branch Officer | Issue procurement supply orders (`POST /orders`); review initial bill submission (`Stage 1 Approval/Rejection`). |
| `PRE_AUDITOR` | Pre-Audit Officer | Verify mathematical accuracy, rates, and receipt matches (`Stage 2 Approval/Rejection`). |
| `GENERAL_MANAGER` | Executive Approver | Review and approve expenditure authorization (`Stage 3 Approval/Rejection`). |
| `FINANCE_OFFICER` | Finance & Accounts Officer | Final clearance (`Stage 4 Approval/Rejection`); initiate simulated payment; simulate gateway callback. |
| `ADMIN` | System Administrator | Full access across all queues, tasks, orders, deliveries, and system configuration. |

---

## 4. Multi-Stage Approval State Machine

```
Supplier Submits Bill
        │
        ▼ (Stage 1: Branch Officer)
   [SUBMITTED] ────────────► [REJECTED] (Terminates pipeline; requires reason)
        │ (Approved)
        ▼ (Stage 2: Pre-Auditor)
 [BRANCH_APPROVED] ────────► [REJECTED]
        │ (Approved)
        ▼ (Stage 3: General Manager)
   [PRE_AUDITED] ──────────► [REJECTED]
        │ (Approved)
        ▼ (Stage 4: Finance Officer)
   [GM_APPROVED] ──────────► [REJECTED]
        │ (Approved)
        ▼
   [APPROVED] (Finance cleared; ready for payment initiation)
```

### Rejection Behavior
* Any stage officer can reject a bill.
* Rejections require a mandatory non-empty comments string (`"comments": "Moisture content exceeds 12% limit"`).
* When rejected, bill status permanently becomes `REJECTED`, the active task transitions to `REJECTED`, and no further workflow tasks are created.
* Suppliers can retrieve rejection reasons directly via `GET /api/v1/approvals/bills/{bill_id}/workflow`.

---

## 5. Simulated Payment Lifecycle

Simulated payment processing executes strictly on the server side without external banking rails or transfer of real money:

```
[APPROVED] ──► POST /api/v1/payments ──► [PAYMENT_PENDING] (Payment: INITIATED)
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     Gateway Callback SUCCESS                                      Gateway Callback FAILED
                 │                                                             │
                 ▼                                                             ▼
         Bill Status: [PAID]                                        Bill Status: [PAYMENT_FAILED]
         (Payment: SUCCESS; Terminal)                                          │
                                                                               ▼
                                                                Finance Officer Retries:
                                                                POST /api/v1/payments ──► [PAYMENT_PENDING]
```

* **Authoritative Amount**: Payment amounts are derived strictly from `bills.total_amount` on the server. The frontend does not send amounts.
* **Idempotency**: Repeated calls to `POST /api/v1/payments` return the existing payment without creating duplicates.
* **Failure Recovery**: If a payment fails (`POST /payments/{id}/simulate-status` with `target_status="FAILED"`), the bill transitions to `PAYMENT_FAILED`. The Finance Officer can initiate a retry.

---

## 6. Standardized Error Handling & Response Envelopes

All error responses from the backend follow standardized FastAPI JSON structures:

```json
{
  "detail": "Description of the error condition"
}
```

For Pydantic validation errors (`422 Unprocessable Entity`):
```json
{
  "detail": [
    {
      "loc": ["body", "delivery_items", 0, "billed_quantity"],
      "msg": "Input should be greater than 0",
      "type": "greater_than"
    }
  ]
}
```

### HTTP Status Code Guide for Frontend Logic

| Status Code | Description | Frontend Action |
| :--- | :--- | :--- |
| `200 OK` | Read or update succeeded. | Update UI state with returned JSON. |
| `201 Created` | Creation or submission succeeded. | Display success toast; redirect or refresh list. |
| `400 Bad Request` | Business rule violation (e.g. invalid bill state, stage skip attempt, missing rejection reason). | Display error message from `data.detail` to user. |
| `401 Unauthorized` | Missing, expired, or invalid Supabase JWT token. | Clear cached session; redirect user to login view. |
| `403 Forbidden` | Insufficient role permissions or accessing another supplier's data. | Show access denied banner; do not permit action. |
| `404 Not Found` | Referenced ID does not exist. | Display not found notification. |
| `409 Conflict` | Duplicate invoice number, already processed task, or active payment already exists. | Inform user of duplicate state; refresh data. |
| `422 Unprocessable` | Payload failed schema validation (e.g. negative number, missing required field). | Highlight specific invalid form fields. |
| `500 Server Error` | Unexpected backend or database error (changes rolled back). | Display generic failure toast ("Server error, please try again"). |

---

## 7. CORS Configuration

The backend is pre-configured to allow local frontend development servers. Permitted origins include:
* `http://localhost:3000` (Next.js / CRA)
* `http://localhost:5173` (Vite)
* `http://localhost:5500` (VS Code Live Server)
* `http://localhost:8080` (Python http.server)
* `http://127.0.0.1:*` (All above ports on loopback IP)

If your local frontend runs on another port, set `ALLOWED_ORIGINS` in `backend/.env`:
```ini
ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000
```

---

## 8. Frontend JavaScript API Client Helper

Copy this reusable client module into your frontend project (`src/api/client.js`):

```javascript
const API_BASE = "http://localhost:8000/api/v1";

/**
 * Generic API request wrapper with automated Bearer token injection
 * and standardized error extraction.
 */
export async function apiRequest(endpoint, { method = "GET", body = null, token = null } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred";
    try {
      const errData = await response.json();
      if (Array.isArray(errData.detail)) {
        // Pydantic validation error array
        errorDetail = errData.detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join("; ");
      } else if (errData.detail) {
        errorDetail = errData.detail;
      }
    } catch {
      errorDetail = response.statusText;
    }

    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  // Return empty object for 204 No Content
  if (response.status === 204) return {};
  return await response.json();
}
```

---

## 9. Example Fetch Operations

### Example 1: Retrieve Current Authenticated User & Role
```javascript
import { apiRequest } from './client.js';

async function fetchUserProfile(token) {
  try {
    const profile = await apiRequest("/auth/me", { token });
    console.log("Logged in user:", profile.full_name, "Role:", profile.role);
    return profile;
  } catch (err) {
    if (err.status === 401) {
      // Session expired, redirect to login
    }
  }
}
```

### Example 2: Supplier Submits a Commercial Bill
```javascript
import { apiRequest } from './client.js';

async function submitCommercialBill(token, invoiceNumber, invoiceDate, deliveryItems) {
  try {
    const bill = await apiRequest("/bills", {
      method: "POST",
      token,
      body: {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate, // Format: YYYY-MM-DD
        delivery_items: deliveryItems.map(item => ({
          delivery_id: item.deliveryId,
          billed_quantity: parseFloat(item.quantity),
          rate: item.rate ? parseFloat(item.rate) : undefined
        }))
      }
    });
    console.log("Bill submitted successfully:", bill.bill_number, "Status:", bill.status);
    return bill;
  } catch (err) {
    alert(`Submission failed: ${err.message}`);
  }
}
```

### Example 3: View Bill Workflow Progress & Rejection Reasons
```javascript
import { apiRequest } from './client.js';

async function loadBillWorkflow(token, billId) {
  try {
    const progress = await apiRequest(`/approvals/bills/${billId}/workflow`, { token });
    console.log("Bill Status:", progress.status);
    if (progress.status === "REJECTED") {
      console.warn("Rejection reason:", progress.rejection_reason);
    }
    return progress;
  } catch (err) {
    console.error("Failed to load workflow history:", err.message);
  }
}
```

### Example 4: Officer Reviews Pending Tasks & Submits Decision
```javascript
import { apiRequest } from './client.js';

// 1. Fetch pending tasks for the officer's role
async function getPendingTasks(token) {
  return await apiRequest("/approvals/tasks/pending", { token });
}

// 2. Submit approval decision
async function approveTask(token, taskId, comments = "") {
  return await apiRequest("/approvals", {
    method: "POST",
    token,
    body: {
      workflow_task_id: taskId,
      decision: "APPROVED",
      comments: comments || "Approved by officer"
    }
  });
}

// 3. Submit rejection decision (comments mandatory)
async function rejectTask(token, taskId, reason) {
  if (!reason.trim()) {
    throw new Error("Rejection reason is mandatory");
  }
  return await apiRequest("/approvals", {
    method: "POST",
    token,
    body: {
      workflow_task_id: taskId,
      decision: "REJECTED",
      comments: reason.trim()
    }
  });
}
```

### Example 5: Finance Officer Initiates Payment & Simulates Gateway Response
```javascript
import { apiRequest } from './client.js';

// 1. Initiate simulated payment for finance-approved bill
async function initiatePayment(token, billId) {
  return await apiRequest("/payments", {
    method: "POST",
    token,
    body: { bill_id: billId }
  });
}

// 2. Simulate asynchronous gateway callback
async function simulateGatewayCallback(token, paymentId, isSuccess, failureReason = null) {
  return await apiRequest(`/payments/${paymentId}/simulate-status`, {
    method: "POST",
    token,
    body: {
      target_status: isSuccess ? "SUCCESS" : "FAILED",
      reason: failureReason
    }
  });
}
```

---

## 10. Database Concurrency Notice

> [!NOTE]
> All concurrency safeguards (row-level locking via `SELECT ... FOR UPDATE`, single-transaction boundaries, and idempotent active payment constraints) are fully defined in PostgreSQL SQL migrations.
> Automated tests validate API contracts, role authorization, and state transitions using simulated PostgREST client mocks. Real multi-connection transactional race condition validation against live PostgreSQL will be performed in staging prior to production rollout.
