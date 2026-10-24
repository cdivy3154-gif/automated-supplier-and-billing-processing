-- 20230915000100_init_schema.sql
-- Supabase migrations – initial schema for Automated Supplier & Billing Processing
-- Run with: supabase db push (or psql -f ...)

-- Enable uuid-ossp (or pgcrypto) for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('ADMIN','SUPPLIER','GODOWN_MANAGER','BRANCH_OFFICER','PRE_AUDITOR','GENERAL_MANAGER','FINANCE_OFFICER')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code text NOT NULL UNIQUE,
    supplier_name text NOT NULL,
    contact_email text,
    contact_phone text,
    address text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. godowns
CREATE TABLE IF NOT EXISTS public.godowns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    godown_code text NOT NULL UNIQUE,
    godown_name text NOT NULL,
    location text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. supply_orders
CREATE TABLE IF NOT EXISTS public.supply_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number text NOT NULL UNIQUE,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    godown_id uuid NOT NULL REFERENCES public.godowns(id) ON DELETE RESTRICT,
    commodity_name text NOT NULL,
    ordered_quantity numeric NOT NULL CHECK (ordered_quantity > 0),
    unit text NOT NULL,
    agreed_rate numeric NOT NULL CHECK (agreed_rate >= 0),
    order_date date NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_number text NOT NULL UNIQUE,
    supply_order_id uuid NOT NULL REFERENCES public.supply_orders(id) ON DELETE RESTRICT,
    delivered_quantity numeric NOT NULL CHECK (delivered_quantity > 0),
    delivery_date date NOT NULL,
    verified_by uuid REFERENCES public.user_profiles(id),
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. delivery_receipts
CREATE TABLE IF NOT EXISTS public.delivery_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number text NOT NULL UNIQUE,
    delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE RESTRICT,
    receipt_reference text,
    issued_by uuid REFERENCES public.user_profiles(id),
    issued_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7. bills
CREATE TABLE IF NOT EXISTS public.bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number text NOT NULL UNIQUE,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    total_amount numeric NOT NULL CHECK (total_amount >= 0),
    status text NOT NULL,
    submitted_by uuid REFERENCES public.user_profiles(id),
    submitted_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT uq_supplier_invoice UNIQUE (supplier_id, invoice_number)
);

-- 8. bill_deliveries (junction)
CREATE TABLE IF NOT EXISTS public.bill_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
    delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE RESTRICT,
    billed_quantity numeric NOT NULL CHECK (billed_quantity > 0),
    rate numeric NOT NULL CHECK (rate >= 0),
    amount numeric NOT NULL CHECK (amount >= 0),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT uq_bill_delivery UNIQUE (bill_id, delivery_id)
);

-- 9. workflow_tasks
CREATE TABLE IF NOT EXISTS public.workflow_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
    assigned_role text NOT NULL CHECK (assigned_role IN ('ADMIN','SUPPLIER','GODOWN_MANAGER','BRANCH_OFFICER','PRE_AUDITOR','GENERAL_MANAGER','FINANCE_OFFICER')),
    assigned_user_id uuid REFERENCES public.user_profiles(id),
    status text NOT NULL,
    remarks text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone
);

-- 10. approvals
CREATE TABLE IF NOT EXISTS public.approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
    workflow_task_id uuid NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE RESTRICT,
    approver_id uuid NOT NULL REFERENCES public.user_profiles(id),
    approver_role text NOT NULL,
    decision text NOT NULL,
    comments text,
    decided_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 11. payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
    payment_reference text NOT NULL UNIQUE,
    amount numeric NOT NULL CHECK (amount >= 0),
    status text NOT NULL,
    initiated_by uuid REFERENCES public.user_profiles(id),
    initiated_at timestamp with time zone NOT NULL DEFAULT now(),
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 12. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES public.user_profiles(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for foreign‑key columns (helps query performance)
CREATE INDEX IF NOT EXISTS idx_supply_orders_supplier_id ON public.supply_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supply_orders_godown_id ON public.supply_orders(godown_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_supply_order_id ON public.deliveries(supply_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_receipts_delivery_id ON public.delivery_receipts(delivery_id);
CREATE INDEX IF NOT EXISTS idx_bills_supplier_id ON public.bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_bill_deliveries_bill_id ON public.bill_deliveries(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_deliveries_delivery_id ON public.bill_deliveries(delivery_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_bill_id ON public.workflow_tasks(bill_id);
CREATE INDEX IF NOT EXISTS idx_approvals_bill_id ON public.approvals(bill_id);
CREATE INDEX IF NOT EXISTS idx_approvals_workflow_task_id ON public.approvals(workflow_task_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON public.payments(bill_id);
