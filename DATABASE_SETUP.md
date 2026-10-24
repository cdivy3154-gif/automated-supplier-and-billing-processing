# DATABASE_SETUP.md
# Automated State Commodity Supplier Billing and Payment Processing
## Phase 1: Database Setup and Security Architecture

---

## 1. Overview & Architecture
This repository contains the authoritative **Supabase PostgreSQL** database schema and security configuration for the *Automated State Commodity Supplier Billing and Payment Processing* system.

The database digitizes the end-to-end procurement and billing lifecycle:
1. **Suppliers & Godowns**: Master data for authorized state suppliers and departmental storage depots.
2. **Supply Orders**: Quantities, commodity specs, and agreed rates authorized by Branch Officers.
3. **Deliveries & Receipts**: Physical deliveries recorded and verified at godowns with digitally signed delivery receipts.
4. **Billing & Junctions**: Supplier invoices submitted against authorized delivery receipts via the `bill_deliveries` junction.
5. **Workflow & Approvals**: Multi-stage review process (Branch Officer -> Pre-Auditor -> General Manager -> Finance Officer) with immutable approval logs.
6. **Payments**: Prototype payment tracking with simulated states (INITIATED, SUCCESS, FAILED, REVERSED) and strict duplicate reference prevention.
7. **Audit Logs & Security**: Tamper-proof audit logs and Row Level Security (RLS) enforcing tenant isolation for suppliers and least-privilege role separation for officers.

---

## 2. Directory Layout
```
automated-supplier-and-billing-processing/
├─ supabase/
│  ├─ migrations/
│  │   ├─ 20230915000100_init_schema.sql         – Core relational tables, constraints, indexes
│  │   ├─ 20230915000200_rls_policies.sql       – 45 RLS policies, helper functions, and triggers
│  │   └─ 20230915000300_security_hardening.sql – Supplier isolation guard, duplicate active payment index, audit policy
│  └─ seed/
│      └─ 20230915000300_seed_data.sql          – Synthetic development seed dataset
├─ sql/
│  ├─ tests.sql                                 – Core database constraints and triggers test suite
│  ├─ security_verification.sql                 – 12-check comprehensive RLS security verification suite
│  └─ test_migration_003.sql                    – Security hardening migration verification suite
├─ DATABASE_SETUP.md                        – This authoritative setup & architecture guide
└─ .env.example                             – Safe environment variable template (no credentials)
```

---

## 3. Database Tables & Relational Schema

| # | Table Name | Purpose | Key Constraints & Relationships | Deletion Rule |
|---|---|---|---|---|
| 1 | `user_profiles` | User accounts linked to Supabase Auth | Role check (`ADMIN`, `SUPPLIER`, `GODOWN_MANAGER`, `BRANCH_OFFICER`, `PRE_AUDITOR`, `GENERAL_MANAGER`, `FINANCE_OFFICER`), optional `supplier_id` FK | RESTRICT |
| 2 | `suppliers` | Registered state suppliers | Unique `supplier_code` | RESTRICT |
| 3 | `godowns` | Government commodity storage godowns | Unique `godown_code` | RESTRICT |
| 4 | `supply_orders` | Authorized procurement supply orders | FK to `suppliers` & `godowns`, positive `ordered_quantity`, non-negative `agreed_rate` | RESTRICT |
| 5 | `deliveries` | Physical deliveries at godowns | FK to `supply_orders`, FK to `user_profiles` (verifier), positive `delivered_quantity` | RESTRICT |
| 6 | `delivery_receipts` | Digitally issued receipts | Unique `receipt_number`, FK to `deliveries`, FK to `user_profiles` (issuer) | RESTRICT |
| 7 | `bills` | Invoices submitted by suppliers | Unique `bill_number`, composite unique (`supplier_id`, `invoice_number`), non-negative `total_amount` | RESTRICT |
| 8 | `bill_deliveries` | Junction linking bills to deliveries | Composite unique (`bill_id`, `delivery_id`), positive `billed_quantity`, non-negative `rate` & `amount` | RESTRICT |
| 9 | `workflow_tasks` | Next assigned action in the bill pipeline | FK to `bills`, role check, optional assigned user FK | RESTRICT |
| 10 | `approvals` | Permanent record of officer approval decisions | FK to `bills` & `workflow_tasks`, FK to `user_profiles` (approver), immutable | RESTRICT |
| 11 | `payments` | Simulated payment processing records | Unique `payment_reference`, FK to `bills`, non-negative `amount`, immutable history | RESTRICT |
| 12 | `audit_logs` | System and operational event logs | Protected against client modifications, immutable | RESTRICT |

---

## 4. Row Level Security (RLS) & Access Control Matrix

Every table has `ROW LEVEL SECURITY` enabled. Access is governed by least-privilege principles:

### Helper Functions:
- `public.current_user_role()`: `SECURITY DEFINER` function returning the caller's role from `public.user_profiles` safely without search-path hijacking.
- `public.current_user_supplier_id()`: `SECURITY DEFINER` function resolving the supplier entity for the authenticated user (via `user_profiles.supplier_id` or matching email).

### Security Triggers:
1. `trg_protect_user_profile`: Prevents non-administrators from escalating their role or assigning the `ADMIN` role.
2. `trg_protect_audit_log`: Guarantees that `audit_logs` records cannot be updated or deleted by any user.
3. `trg_protect_approval_history`: Guarantees that approval decisions cannot be updated once recorded, preserving historical integrity.

### Role Permissions:
- **SUPPLIER**:
  - View only their own supplier profile, supply orders, deliveries, delivery receipts, bills, and bill deliveries.
  - Can INSERT bills for their own `supplier_id`.
  - Cannot access other suppliers' records or internal audit logs.
- **GODOWN_MANAGER**:
  - View godowns, orders, and deliveries.
  - Record deliveries and digitally issue delivery receipts.
- **BRANCH_OFFICER**:
  - Issue supply orders and participate in bill review workflows.
- **PRE_AUDITOR & GENERAL_MANAGER**:
  - Review bills, inspect delivery receipts, and record approval decisions.
- **FINANCE_OFFICER**:
  - Review bills, initiate payments, and view full financial history.
- **ADMIN**:
  - Manage master data, user profiles, and view audit logs.

---

## 5. Migration Workflow

### Step 1: Link Local Repository to Remote Supabase Project
From the repository root (`/Users/nishantchaudhari/Desktop/automated-supplier-and-billing-processing`):
```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

### Step 2: Push Migrations
```bash
supabase db push
```
The Supabase CLI will connect to your remote database and execute `20230915000200_rls_policies.sql`.

### Step 3: Seed Synthetic Data (Optional for Development)
Seed data can be applied directly using the Supabase CLI (no `psql` required):
```bash
supabase db query --linked --file supabase/seed/20230915000300_seed_data.sql
```
*Alternatively, you can open the **SQL Editor** in your Supabase Web Dashboard, paste the contents of `supabase/seed/20230915000300_seed_data.sql`, and click **Run**.*

---

## 6. Supabase Auth & Test User Setup

Do **not** insert directly into internal `auth.users`. To create test users:

1. **Create Auth Users** via Supabase Dashboard (Authentication -> Users -> Add User) or CLI:
   ```bash
   supabase auth signup --email supplier1@example.com --password "TestPass123!"
   supabase auth signup --email godownmgr@example.com --password "TestPass123!"
   supabase auth signup --email admin@example.com --password "TestPass123!"
   ```

2. **Link `public.user_profiles`**:
   The user's UUID in `auth.users` corresponds to `user_profiles.id`:
   ```sql
   INSERT INTO public.user_profiles (id, full_name, email, role, supplier_id)
   VALUES (
       '<AUTH_USER_UUID>',
       'Acme Representative',
       'supplier1@example.com',
       'SUPPLIER',
       (SELECT id FROM public.suppliers WHERE supplier_code = 'SUP001')
   );
   ```

---

## 7. Validation & Automated Tests

A dedicated test suite is located in `sql/tests.sql`.

To run the test suite against your linked database (no `psql` required):
```bash
supabase db query --linked --file sql/tests.sql
```
*Or paste the contents of `sql/tests.sql` into the Supabase Dashboard **SQL Editor** and click **Run**.*

The script runs inside a transaction and rolls back at completion, leaving test data clean. It tests:
- `ordered_quantity > 0` and `agreed_rate >= 0` check constraints
- `total_amount >= 0` check constraints
- Invalid user role rejection
- Duplicate delivery receipt rejection
- Duplicate supplier invoice per supplier rejection
- Duplicate payment reference rejection
- Duplicate bill-delivery junction association rejection
- Invalid foreign key rejection
- RESTRICT delete behavior on parent records
- Immutability trigger on `audit_logs` (UPDATE / DELETE rejected)
- Immutability trigger on `approvals` (UPDATE rejected)
- Role escalation prevention trigger on `user_profiles` (non-admin role change blocked)

---

## 8. Environment Configuration (`.env.example`)
Create a local `.env` file (ensure it is git-ignored):
```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=your-publishable-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-privileged-service-role-key
```

> [!WARNING]
> Never commit `.env` or expose the `SUPABASE_SERVICE_ROLE_KEY` to frontend or public repositories. The service role key bypasses Row Level Security.
