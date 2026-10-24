-- 20230915000200_rls_policies.sql
-- Supabase RLS Policies and Security Configuration for Phase 1 Prototype
-- Automated State Commodity Supplier Billing and Payment Processing

-- ============================================================================
-- 1. SCHEMA EXTENSIONS & HELPER COLUMNS
-- ============================================================================

-- Ensure supplier association exists on user profiles for supplier isolation
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_supplier_id ON public.user_profiles(supplier_id);

-- ============================================================================
-- 2. SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Returns the supplier_id associated with the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_supplier_id()
RETURNS uuid AS $$
    SELECT COALESCE(
        up.supplier_id,
        s.id
    )
    FROM public.user_profiles up
    LEFT JOIN public.suppliers s ON s.contact_email = up.email
    WHERE up.id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.godowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CLEAN UP ANY PREVIOUS POLICIES (IDEMPOTENT MIGRATION)
-- ============================================================================

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- 5. DATABASE INTEGRITY & SECURITY TRIGGERS
-- ============================================================================

-- Prevent non-admins from changing roles or creating ADMIN profiles
CREATE OR REPLACE FUNCTION public.trg_protect_user_profile()
RETURNS trigger AS $$
BEGIN
    -- Allow direct database management / seed / migrations when auth.uid() is null
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.id != OLD.id THEN
        RAISE EXCEPTION 'User profile ID cannot be changed';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.role = 'ADMIN' THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can create ADMIN profiles';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_user_profile ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile
    BEFORE INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_user_profile();

-- Protect audit records: completely immutable against UPDATE or DELETE
CREATE OR REPLACE FUNCTION public.trg_protect_audit_log()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_audit_log ON public.audit_logs;
CREATE TRIGGER trg_protect_audit_log
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_audit_log();

-- Protect approval history: decisions cannot be altered once recorded
CREATE OR REPLACE FUNCTION public.trg_protect_approval_history()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Approval decisions are permanent and cannot be modified';
    ELSIF TG_OP = 'DELETE' THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can delete approval records';
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_approval_history ON public.approvals;
CREATE TRIGGER trg_protect_approval_history
    BEFORE UPDATE OR DELETE ON public.approvals
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_approval_history();

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-------------------------------------------------------------------------------
-- 1. user_profiles
-------------------------------------------------------------------------------
CREATE POLICY user_profiles_select ON public.user_profiles
    FOR SELECT USING (auth.uid() = id OR public.current_user_role() = 'ADMIN');

CREATE POLICY user_profiles_insert ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR public.current_user_role() = 'ADMIN');

CREATE POLICY user_profiles_update ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id OR public.current_user_role() = 'ADMIN')
    WITH CHECK (auth.uid() = id OR public.current_user_role() = 'ADMIN');

CREATE POLICY user_profiles_delete ON public.user_profiles
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 2. suppliers
-------------------------------------------------------------------------------
CREATE POLICY suppliers_select ON public.suppliers
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','BRANCH_OFFICER','GODOWN_MANAGER','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER')
        OR id = public.current_user_supplier_id()
    );

CREATE POLICY suppliers_insert ON public.suppliers
    FOR INSERT WITH CHECK (public.current_user_role() = 'ADMIN');

CREATE POLICY suppliers_update ON public.suppliers
    FOR UPDATE USING (public.current_user_role() = 'ADMIN')
    WITH CHECK (public.current_user_role() = 'ADMIN');

CREATE POLICY suppliers_delete ON public.suppliers
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 3. godowns
-------------------------------------------------------------------------------
CREATE POLICY godowns_select ON public.godowns
    FOR SELECT USING (true);

CREATE POLICY godowns_insert ON public.godowns
    FOR INSERT WITH CHECK (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'));

CREATE POLICY godowns_update ON public.godowns
    FOR UPDATE USING (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'))
    WITH CHECK (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'));

CREATE POLICY godowns_delete ON public.godowns
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 4. supply_orders
-------------------------------------------------------------------------------
CREATE POLICY supply_orders_select ON public.supply_orders
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','BRANCH_OFFICER','GODOWN_MANAGER','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER')
        OR supplier_id = public.current_user_supplier_id()
    );

CREATE POLICY supply_orders_insert ON public.supply_orders
    FOR INSERT WITH CHECK (public.current_user_role() IN ('ADMIN','BRANCH_OFFICER'));

CREATE POLICY supply_orders_update ON public.supply_orders
    FOR UPDATE USING (public.current_user_role() IN ('ADMIN','BRANCH_OFFICER'))
    WITH CHECK (public.current_user_role() IN ('ADMIN','BRANCH_OFFICER'));

CREATE POLICY supply_orders_delete ON public.supply_orders
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 5. deliveries
-------------------------------------------------------------------------------
CREATE POLICY deliveries_select ON public.deliveries
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','GODOWN_MANAGER','BRANCH_OFFICER','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER')
        OR EXISTS (
            SELECT 1 FROM public.supply_orders so
            WHERE so.id = deliveries.supply_order_id
              AND so.supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY deliveries_insert ON public.deliveries
    FOR INSERT WITH CHECK (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'));

CREATE POLICY deliveries_update ON public.deliveries
    FOR UPDATE USING (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'))
    WITH CHECK (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'));

CREATE POLICY deliveries_delete ON public.deliveries
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 6. delivery_receipts
-------------------------------------------------------------------------------
CREATE POLICY delivery_receipts_select ON public.delivery_receipts
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','GODOWN_MANAGER','BRANCH_OFFICER','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER')
        OR issued_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.deliveries d
            JOIN public.supply_orders so ON so.id = d.supply_order_id
            WHERE d.id = delivery_receipts.delivery_id
              AND so.supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY delivery_receipts_insert ON public.delivery_receipts
    FOR INSERT WITH CHECK (public.current_user_role() IN ('ADMIN','GODOWN_MANAGER'));

CREATE POLICY delivery_receipts_update ON public.delivery_receipts
    FOR UPDATE USING (public.current_user_role() = 'ADMIN')
    WITH CHECK (public.current_user_role() = 'ADMIN');

CREATE POLICY delivery_receipts_delete ON public.delivery_receipts
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 7. bills
-------------------------------------------------------------------------------
CREATE POLICY bills_select ON public.bills
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER','BRANCH_OFFICER')
        OR supplier_id = public.current_user_supplier_id()
    );

CREATE POLICY bills_insert ON public.bills
    FOR INSERT WITH CHECK (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER')
        OR (
            public.current_user_role() = 'SUPPLIER'
            AND supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY bills_update ON public.bills
    FOR UPDATE USING (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER')
        OR (
            public.current_user_role() = 'SUPPLIER'
            AND supplier_id = public.current_user_supplier_id()
            AND status = 'DRAFT'
        )
    )
    WITH CHECK (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER')
        OR (
            public.current_user_role() = 'SUPPLIER'
            AND supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY bills_delete ON public.bills
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 8. bill_deliveries
-------------------------------------------------------------------------------
CREATE POLICY bill_deliveries_select ON public.bill_deliveries
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER','BRANCH_OFFICER')
        OR EXISTS (
            SELECT 1 FROM public.bills b
            WHERE b.id = bill_deliveries.bill_id
              AND b.supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY bill_deliveries_insert ON public.bill_deliveries
    FOR INSERT WITH CHECK (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER')
        OR EXISTS (
            SELECT 1 FROM public.bills b
            WHERE b.id = bill_deliveries.bill_id
              AND b.supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY bill_deliveries_update ON public.bill_deliveries
    FOR UPDATE USING (public.current_user_role() IN ('ADMIN','FINANCE_OFFICER'))
    WITH CHECK (public.current_user_role() IN ('ADMIN','FINANCE_OFFICER'));

CREATE POLICY bill_deliveries_delete ON public.bill_deliveries
    FOR DELETE USING (public.current_user_role() IN ('ADMIN','FINANCE_OFFICER'));

-------------------------------------------------------------------------------
-- 9. workflow_tasks
-------------------------------------------------------------------------------
CREATE POLICY workflow_tasks_select ON public.workflow_tasks
    FOR SELECT USING (
        public.current_user_role() = 'ADMIN'
        OR assigned_role = public.current_user_role()
        OR assigned_user_id = auth.uid()
    );

CREATE POLICY workflow_tasks_insert ON public.workflow_tasks
    FOR INSERT WITH CHECK (
        public.current_user_role() IN ('ADMIN','BRANCH_OFFICER','FINANCE_OFFICER','GENERAL_MANAGER','PRE_AUDITOR')
    );

CREATE POLICY workflow_tasks_update ON public.workflow_tasks
    FOR UPDATE USING (
        public.current_user_role() = 'ADMIN'
        OR assigned_role = public.current_user_role()
        OR assigned_user_id = auth.uid()
    )
    WITH CHECK (
        public.current_user_role() = 'ADMIN'
        OR assigned_role = public.current_user_role()
        OR assigned_user_id = auth.uid()
    );

CREATE POLICY workflow_tasks_delete ON public.workflow_tasks
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 10. approvals
-------------------------------------------------------------------------------
CREATE POLICY approvals_select ON public.approvals
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER','BRANCH_OFFICER')
    );

CREATE POLICY approvals_insert ON public.approvals
    FOR INSERT WITH CHECK (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER','PRE_AUDITOR','GENERAL_MANAGER','BRANCH_OFFICER')
    );

-- Notice: No UPDATE policy. Approval decisions cannot be modified once made.

CREATE POLICY approvals_delete ON public.approvals
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 11. payments
-------------------------------------------------------------------------------
CREATE POLICY payments_select ON public.payments
    FOR SELECT USING (
        public.current_user_role() IN ('ADMIN','FINANCE_OFFICER')
        OR EXISTS (
            SELECT 1 FROM public.bills b
            WHERE b.id = payments.bill_id
              AND b.supplier_id = public.current_user_supplier_id()
        )
    );

CREATE POLICY payments_insert ON public.payments
    FOR INSERT WITH CHECK (public.current_user_role() IN ('ADMIN','FINANCE_OFFICER'));

CREATE POLICY payments_update ON public.payments
    FOR UPDATE USING (public.current_user_role() IN ('ADMIN','FINANCE_OFFICER'))
    WITH CHECK (public.current_user_role() IN ('ADMIN','FINANCE_OFFICER'));

CREATE POLICY payments_delete ON public.payments
    FOR DELETE USING (public.current_user_role() = 'ADMIN');

-------------------------------------------------------------------------------
-- 12. audit_logs
-------------------------------------------------------------------------------
CREATE POLICY audit_logs_select ON public.audit_logs
    FOR SELECT USING (public.current_user_role() = 'ADMIN');

CREATE POLICY audit_logs_insert ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Notice: No UPDATE policy. Audit logs are strictly immutable.
-- Notice: No DELETE policy. Audit records cannot be deleted via the client.
