-- ============================================================================
-- VALIDATION TEST SUITE FOR MIGRATION 20230915000300_security_hardening.sql
-- ============================================================================
-- Executes inside a transaction and rolls back at completion.
-- Safe to run against the linked database.
-- ============================================================================

BEGIN;

CREATE TEMPORARY TABLE mig003_test_results (
    test_id serial PRIMARY KEY,
    test_name text NOT NULL,
    category text NOT NULL,
    expected text NOT NULL,
    actual text NOT NULL,
    result text NOT NULL,
    details text
);

CREATE OR REPLACE FUNCTION record_mig003_test(
    p_name text,
    p_cat text,
    p_exp text,
    p_act text,
    p_res text,
    p_det text
) RETURNS void AS $$
BEGIN
    INSERT INTO mig003_test_results (test_name, category, expected, actual, result, details)
    VALUES (p_name, p_cat, p_exp, p_act, p_res, p_det);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 1. APPLY MIGRATION 20230915000300 IN-TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_protect_user_profile()
RETURNS trigger AS $$
BEGIN
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

    IF TG_OP = 'UPDATE' AND NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can change supplier association';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'SUPPLIER' THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can create privileged user profiles';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.supplier_id IS NOT NULL THEN
        IF public.current_user_role() IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Only administrators can assign supplier association';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_payment_per_bill
    ON public.payments (bill_id)
    WHERE status NOT IN ('FAILED', 'REVERSED', 'CANCELLED', 'REJECTED');

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;

CREATE POLICY audit_logs_insert ON public.audit_logs
    FOR INSERT WITH CHECK (public.current_user_role() = 'ADMIN');

-- ============================================================================
-- 2. SETUP TEST FIXTURES
-- ============================================================================
DO $$
DECLARE
    v_sup1_id uuid := gen_random_uuid();
    v_sup2_id uuid := gen_random_uuid();
    v_user1_id uuid := gen_random_uuid();
    v_bill_test1_id uuid := gen_random_uuid();
    v_bill_test2_id uuid := gen_random_uuid();
    v_admin_id uuid;
    v_check_supplier_id uuid;
BEGIN
    -- Insert test suppliers
    INSERT INTO public.suppliers (id, supplier_code, supplier_name)
    VALUES (v_sup1_id, 'TEST-MIG3-S1', 'Mig3 Supplier 1'),
           (v_sup2_id, 'TEST-MIG3-S2', 'Mig3 Supplier 2');

    -- Insert test user
    INSERT INTO public.user_profiles (id, full_name, email, role, supplier_id)
    VALUES (v_user1_id, 'Mig3 Supplier User', 'mig3@test.com', 'SUPPLIER', v_sup1_id);

    -- Insert test bills
    INSERT INTO public.bills (id, bill_number, supplier_id, invoice_number, invoice_date, total_amount, status)
    VALUES (v_bill_test1_id, 'TEST-MIG3-BILL1', v_sup1_id, 'INV-M3-1', CURRENT_DATE, 1000, 'APPROVED'),
           (v_bill_test2_id, 'TEST-MIG3-BILL2', v_sup1_id, 'INV-M3-2', CURRENT_DATE, 2000, 'APPROVED');

    SELECT id INTO v_admin_id FROM public.user_profiles WHERE role = 'ADMIN' LIMIT 1;

    -- ========================================================================
    -- TEST 1: SUPPLIER ID REASSIGNMENT (AUTHENTICATED CONTEXT)
    -- ========================================================================
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user1_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    BEGIN
        UPDATE public.user_profiles SET supplier_id = v_sup2_id WHERE id = v_user1_id;
        PERFORM record_mig003_test(
            'Prevent supplier_id reassignment on UPDATE',
            'SUPPLIER_PROTECTION',
            'Blocked by trigger with exception',
            'UPDATE succeeded without exception',
            'FAIL',
            'User was able to reassign their supplier_id'
        );
    EXCEPTION WHEN raise_exception THEN
        PERFORM record_mig003_test(
            'Prevent supplier_id reassignment on UPDATE',
            'SUPPLIER_PROTECTION',
            'Blocked by trigger with exception',
            'Blocked: ' || SQLERRM,
            'PASS',
            'Trigger successfully blocked non-admin supplier_id update'
        );
    END;

    -- ========================================================================
    -- TEST 2: SUPPLIER ID SELF-BINDING ON CREATION (AUTHENTICATED CONTEXT)
    -- ========================================================================
    BEGIN
        INSERT INTO public.user_profiles (id, full_name, email, role, supplier_id)
        VALUES (gen_random_uuid(), 'Rogue Signup', 'rogue@test.com', 'SUPPLIER', v_sup2_id);
        PERFORM record_mig003_test(
            'Prevent non-admin binding supplier_id on INSERT',
            'SUPPLIER_PROTECTION',
            'Blocked by trigger with exception',
            'INSERT succeeded',
            'FAIL',
            'Client user self-assigned supplier_id on signup'
        );
    EXCEPTION WHEN raise_exception THEN
        PERFORM record_mig003_test(
            'Prevent non-admin binding supplier_id on INSERT',
            'SUPPLIER_PROTECTION',
            'Blocked by trigger with exception',
            'Blocked: ' || SQLERRM,
            'PASS',
            'Trigger successfully blocked non-admin supplier_id on creation'
        );
    END;

    -- ========================================================================
    -- TEST 3: ROLE ESCALATION (AUTHENTICATED CONTEXT)
    -- ========================================================================
    BEGIN
        UPDATE public.user_profiles SET role = 'ADMIN' WHERE id = v_user1_id;
        PERFORM record_mig003_test('Prevent role escalation via UPDATE', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Role updated to ADMIN', 'FAIL', 'User escalated role to ADMIN');
    EXCEPTION WHEN raise_exception THEN
        PERFORM record_mig003_test('Prevent role escalation via UPDATE', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Blocked: ' || SQLERRM, 'PASS', 'Role update blocked');
    END;

    BEGIN
        INSERT INTO public.user_profiles (id, full_name, email, role)
        VALUES (gen_random_uuid(), 'Rogue Officer', 'officer@test.com', 'FINANCE_OFFICER');
        PERFORM record_mig003_test('Prevent self-assigning privileged role on INSERT', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Profile inserted with FINANCE_OFFICER', 'FAIL', 'User created non-SUPPLIER privileged role');
    EXCEPTION WHEN raise_exception THEN
        PERFORM record_mig003_test('Prevent self-assigning privileged role on INSERT', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Blocked: ' || SQLERRM, 'PASS', 'Privileged role creation blocked for non-admin');
    END;

    -- ========================================================================
    -- TEST 4: FABRICATED AUDIT LOG INSERTION (AUTHENTICATED CONTEXT)
    -- ========================================================================
    BEGIN
        INSERT INTO public.audit_logs (actor_id, action, entity_type, details)
        VALUES (v_admin_id, 'FABRICATED_EVENT', 'system', '{"fake": true}');
        PERFORM record_mig003_test('Prevent client inserting fabricated audit records', 'AUDIT_PROTECTION',
            'Blocked by RLS audit_logs_insert', 'Audit log inserted by client', 'FAIL', 'Client inserted audit record');
    EXCEPTION WHEN insufficient_privilege THEN
        PERFORM record_mig003_test('Prevent client inserting fabricated audit records', 'AUDIT_PROTECTION',
            'Blocked by RLS audit_logs_insert', 'Blocked with insufficient_privilege', 'PASS', 'Client audit insert successfully blocked');
    END;

    -- Switch back to postgres admin for payment and index checks
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    -- ========================================================================
    -- TEST 5: PREVENT DUPLICATE ACTIVE PAYMENTS FOR SAME BILL
    -- ========================================================================
    INSERT INTO public.payments (bill_id, payment_reference, amount, status)
    VALUES (v_bill_test1_id, 'TEST-PAY-ACT-1', 1000, 'INITIATED');

    BEGIN
        -- Attempt second active payment for Bill 1
        INSERT INTO public.payments (bill_id, payment_reference, amount, status)
        VALUES (v_bill_test1_id, 'TEST-PAY-ACT-2', 1000, 'CONFIRMED');
        PERFORM record_mig003_test('Reject duplicate active payment for same bill', 'PAYMENT_INTEGRITY',
            'Blocked by unique index uq_active_payment_per_bill', 'Allowed second active payment', 'FAIL',
            'Multiple active payments created for same bill');
    EXCEPTION WHEN unique_violation THEN
        PERFORM record_mig003_test('Reject duplicate active payment for same bill', 'PAYMENT_INTEGRITY',
            'Blocked by unique index uq_active_payment_per_bill', 'Rejected with unique_violation', 'PASS',
            'Partial unique index successfully prevented duplicate active payment');
    END;

    -- ========================================================================
    -- TEST 6: ALLOW LEGITIMATE RETRIES ON PAYMENT FAILURE AND REVERSAL
    -- ========================================================================
    -- Initial payment fails
    INSERT INTO public.payments (bill_id, payment_reference, amount, status)
    VALUES (v_bill_test2_id, 'TEST-PAY-FAIL-1', 2000, 'FAILED');

    -- Retry 1 initiates
    INSERT INTO public.payments (bill_id, payment_reference, amount, status)
    VALUES (v_bill_test2_id, 'TEST-PAY-RETRY-1', 2000, 'INITIATED');

    -- Retry 1 gets reversed
    UPDATE public.payments SET status = 'REVERSED' WHERE payment_reference = 'TEST-PAY-RETRY-1';

    -- Retry 2 initiates after reversal
    BEGIN
        INSERT INTO public.payments (bill_id, payment_reference, amount, status)
        VALUES (v_bill_test2_id, 'TEST-PAY-RETRY-2', 2000, 'CONFIRMED');
        PERFORM record_mig003_test('Allow payment retry after FAILURE and REVERSAL', 'PAYMENT_INTEGRITY',
            'Retry payment inserted successfully', 'Allowed retry after failed and reversed attempts', 'PASS',
            'History preserved: 1 FAILED, 1 REVERSED, 1 CONFIRMED all coexist on same bill');
    EXCEPTION WHEN unique_violation THEN
        PERFORM record_mig003_test('Allow payment retry after FAILURE and REVERSAL', 'PAYMENT_INTEGRITY',
            'Retry payment inserted successfully', 'Blocked by index unexpectedly', 'FAIL',
            'Failed/reversed statuses should not block new payment attempt');
    END;

END $$;

-- ============================================================================
-- OUTPUT TEST RESULTS
-- ============================================================================
SELECT 
    test_id,
    test_name,
    category,
    result,
    expected,
    actual,
    details
FROM mig003_test_results
ORDER BY test_id;

-- Clean rollback (leaves database untouched)
ROLLBACK;
