-- 20230915000300_security_hardening.sql
-- Security Hardening Migration for Phase 1 Prototype
-- Automated State Commodity Supplier Billing and Payment Processing

-- ============================================================================
-- 1. SUPPLIER ASSOCIATION & USER PROFILE PROTECTION
-- ============================================================================
-- Update trg_protect_user_profile to prevent non-admins from changing supplier_id
-- or self-assigning privileged roles or supplier associations on creation.

CREATE OR REPLACE FUNCTION public.trg_protect_user_profile()
RETURNS trigger AS $$
BEGIN
    -- Allow direct database management / seed / migrations when auth.uid() is null
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Prevent ID modification
    IF TG_OP = 'UPDATE' AND NEW.id != OLD.id THEN
        RAISE EXCEPTION 'User profile ID cannot be changed';
    END IF;

    -- Prevent non-admins from modifying user roles
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;
    END IF;

    -- Prevent non-admins from altering supplier_id association
    IF TG_OP = 'UPDATE' AND NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can change supplier association';
        END IF;
    END IF;

    -- Prevent non-admins from self-assigning privileged roles upon creation
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'SUPPLIER' THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can create privileged user profiles';
        END IF;
    END IF;

    -- Prevent non-admins from binding a supplier_id upon creation
    IF TG_OP = 'INSERT' AND NEW.supplier_id IS NOT NULL THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can assign supplier association';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. PREVENT DUPLICATE ACTIVE PAYMENTS PER BILL
-- ============================================================================
-- Enforce that a bill can have at most ONE active or successful payment at a time.
-- Terminal non-active states ('FAILED', 'REVERSED', 'CANCELLED', 'REJECTED')
-- are excluded from the index, allowing legitimate payment retries or reversals.

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_payment_per_bill
    ON public.payments (bill_id)
    WHERE status NOT IN ('FAILED', 'REVERSED', 'CANCELLED', 'REJECTED');

-- ============================================================================
-- 3. AUDIT LOG PROTECTION
-- ============================================================================
-- Remove the unrestricted WITH CHECK (true) policy.
-- Ordinary client applications cannot directly insert audit records.
-- Trusted backend operations (Node.js via service_role key) record audit logs.
-- Administrators retain client-level audit insertion capability.

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;

CREATE POLICY audit_logs_insert ON public.audit_logs
    FOR INSERT WITH CHECK (public.current_user_role() = 'ADMIN');
