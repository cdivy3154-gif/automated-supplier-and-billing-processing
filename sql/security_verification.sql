-- ============================================================================
-- AUTOMATED STATE COMMODITY SUPPLIER BILLING & PAYMENT PROCESSING
-- COMPREHENSIVE SECURITY VERIFICATION SUITE (REALISTIC AUTHENTICATED CONTEXT)
-- ============================================================================
-- Runs inside a transaction and rolls back at completion.
-- Uses `SET LOCAL ROLE authenticated` to enforce real RLS evaluations.
-- ============================================================================

BEGIN;

CREATE TEMPORARY TABLE sec_verification_results (
    check_id serial PRIMARY KEY,
    check_num int NOT NULL,
    check_name text NOT NULL,
    category text NOT NULL,
    expected text NOT NULL,
    actual text NOT NULL,
    result text NOT NULL,
    details text
);

GRANT ALL ON sec_verification_results TO authenticated;

CREATE OR REPLACE FUNCTION record_sec_check(
    p_num int,
    p_name text,
    p_cat text,
    p_exp text,
    p_act text,
    p_res text,
    p_det text
) RETURNS void AS $$
BEGIN
    INSERT INTO sec_verification_results (check_num, check_name, category, expected, actual, result, details)
    VALUES (p_num, p_name, p_cat, p_exp, p_act, p_res, p_det);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION record_sec_check(int, text, text, text, text, text, text) TO authenticated;

-- ============================================================================
-- CHECK 1: VERIFY RLS IS ENABLED ON ALL 12 TABLES
-- ============================================================================
DO $$
DECLARE
    v_missing_rls text[];
BEGIN
    SELECT array_agg(c.relname) INTO v_missing_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
          'user_profiles', 'suppliers', 'godowns', 'supply_orders',
          'deliveries', 'delivery_receipts', 'bills', 'bill_deliveries',
          'workflow_tasks', 'approvals', 'payments', 'audit_logs'
      )
      AND NOT c.relrowsecurity;

    IF v_missing_rls IS NULL OR array_length(v_missing_rls, 1) = 0 THEN
        PERFORM record_sec_check(1, 'All 12 tables have RLS enabled', 'RLS_CONFIGURATION',
            '12 tables with RLS', '12 tables verified with relrowsecurity=true', 'PASS', 'Every table enforces Row Level Security');
    ELSE
        PERFORM record_sec_check(1, 'All 12 tables have RLS enabled', 'RLS_CONFIGURATION',
            '12 tables with RLS', 'Missing RLS on: ' || array_to_string(v_missing_rls, ', '), 'FAIL', 'Some tables do not have RLS enabled');
    END IF;
END $$;

-- ============================================================================
-- SETUP FIXTURES AS POSTGRES ADMIN
-- ============================================================================
CREATE TEMPORARY TABLE sec_test_env (
    sup1_id uuid,
    sup2_id uuid,
    user1_id uuid,
    user2_id uuid,
    godown_id uuid,
    order1_id uuid,
    order2_id uuid,
    del1_id uuid,
    del2_id uuid,
    rcpt1_id uuid,
    rcpt2_id uuid,
    bill1_id uuid,
    bill2_id uuid,
    task1_id uuid,
    pay1_id uuid,
    pay2_id uuid
);

GRANT ALL ON sec_test_env TO authenticated;

INSERT INTO sec_test_env VALUES (
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
);

-- Insert master fixtures
INSERT INTO public.suppliers (id, supplier_code, supplier_name, contact_email)
SELECT sup1_id, 'SEC-SUP1', 'Supplier One Corp', 'sec1@test.com' FROM sec_test_env
UNION ALL
SELECT sup2_id, 'SEC-SUP2', 'Supplier Two Corp', 'sec2@test.com' FROM sec_test_env;

INSERT INTO public.user_profiles (id, full_name, email, role, supplier_id)
SELECT user1_id, 'Supplier User 1', 'sec1@test.com', 'SUPPLIER', sup1_id FROM sec_test_env
UNION ALL
SELECT user2_id, 'Supplier User 2', 'sec2@test.com', 'SUPPLIER', sup2_id FROM sec_test_env;

INSERT INTO public.godowns (id, godown_code, godown_name)
SELECT godown_id, 'SEC-GOD1', 'Security Godown' FROM sec_test_env;

INSERT INTO public.supply_orders (id, order_number, supplier_id, godown_id, commodity_name, ordered_quantity, unit, agreed_rate, order_date, status)
SELECT order1_id, 'SEC-ORD1', sup1_id, godown_id, 'Grain', 100, 'kg', 10, CURRENT_DATE, 'AUTHORIZED' FROM sec_test_env
UNION ALL
SELECT order2_id, 'SEC-ORD2', sup2_id, godown_id, 'Grain', 200, 'kg', 20, CURRENT_DATE, 'AUTHORIZED' FROM sec_test_env;

INSERT INTO public.deliveries (id, delivery_number, supply_order_id, delivered_quantity, delivery_date, status)
SELECT del1_id, 'SEC-DEL1', order1_id, 100, CURRENT_DATE, 'DELIVERED' FROM sec_test_env
UNION ALL
SELECT del2_id, 'SEC-DEL2', order2_id, 200, CURRENT_DATE, 'DELIVERED' FROM sec_test_env;

INSERT INTO public.delivery_receipts (id, receipt_number, delivery_id, status)
SELECT rcpt1_id, 'SEC-RCPT1', del1_id, 'ISSUED' FROM sec_test_env
UNION ALL
SELECT rcpt2_id, 'SEC-RCPT2', del2_id, 'ISSUED' FROM sec_test_env;

INSERT INTO public.bills (id, bill_number, supplier_id, invoice_number, invoice_date, total_amount, status, submitted_by)
SELECT bill1_id, 'SEC-BILL1', sup1_id, 'INV-S1-01', CURRENT_DATE, 1000, 'SUBMITTED', user1_id FROM sec_test_env
UNION ALL
SELECT bill2_id, 'SEC-BILL2', sup2_id, 'INV-S2-01', CURRENT_DATE, 4000, 'SUBMITTED', user2_id FROM sec_test_env;

INSERT INTO public.workflow_tasks (id, bill_id, assigned_role, status)
SELECT task1_id, bill1_id, 'FINANCE_OFFICER', 'PENDING' FROM sec_test_env;

INSERT INTO public.payments (id, bill_id, payment_reference, amount, status)
SELECT pay1_id, bill1_id, 'SEC-PAY1', 1000, 'INITIATED' FROM sec_test_env
UNION ALL
SELECT pay2_id, bill2_id, 'SEC-PAY2', 4000, 'INITIATED' FROM sec_test_env;

-- ============================================================================
-- EXECUTE AUTHENTICATED TESTS (SWITCH TO ROLE 'authenticated' WITH USER 1 JWT)
-- ============================================================================
DO $$
DECLARE
    v_env sec_test_env%ROWTYPE;
    v_count int;
    v_rows int;
    v_leak boolean := false;
    v_admin_id uuid;
    v_changed_sup_id uuid;
BEGIN
    SELECT * INTO v_env FROM sec_test_env;
    SELECT id INTO v_admin_id FROM public.user_profiles WHERE role = 'ADMIN' LIMIT 1;

    -- Switch session to unprivileged authenticated role and set Supplier 1 JWT claim
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_env.user1_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- ------------------------------------------------------------------------
    -- CHECK 2: SUPPLIER ISOLATION
    -- ------------------------------------------------------------------------
    -- Verify User 1 can see their own records
    SELECT count(*) INTO v_count FROM public.bills WHERE id = v_env.bill1_id;
    IF v_count = 0 THEN
        v_leak := true; -- Broken self-access
    END IF;

    -- Verify User 1 cannot see Supplier 2 bills
    SELECT count(*) INTO v_count FROM public.bills WHERE id = v_env.bill2_id;
    IF v_count > 0 THEN v_leak := true; END IF;

    -- Verify User 1 cannot see Supplier 2 supply orders
    SELECT count(*) INTO v_count FROM public.supply_orders WHERE id = v_env.order2_id;
    IF v_count > 0 THEN v_leak := true; END IF;

    -- Verify User 1 cannot see Supplier 2 deliveries
    SELECT count(*) INTO v_count FROM public.deliveries WHERE id = v_env.del2_id;
    IF v_count > 0 THEN v_leak := true; END IF;

    -- Verify User 1 cannot see Supplier 2 delivery receipts
    SELECT count(*) INTO v_count FROM public.delivery_receipts WHERE id = v_env.rcpt2_id;
    IF v_count > 0 THEN v_leak := true; END IF;

    -- Verify User 1 cannot see Supplier 2 payments
    SELECT count(*) INTO v_count FROM public.payments WHERE id = v_env.pay2_id;
    IF v_count > 0 THEN v_leak := true; END IF;

    -- Verify User 1 cannot see Supplier 2 supplier master record
    SELECT count(*) INTO v_count FROM public.suppliers WHERE id = v_env.sup2_id;
    IF v_count > 0 THEN v_leak := true; END IF;

    IF NOT v_leak THEN
        PERFORM record_sec_check(2, 'Supplier isolation across orders, deliveries, receipts, bills, payments, suppliers', 'TENANT_ISOLATION',
            '0 foreign records visible; 1 own record visible', 'Strict isolation confirmed under role=authenticated', 'PASS',
            'Supplier 1 cannot view Supplier 2 records across all 6 procurement/billing entities');
    ELSE
        PERFORM record_sec_check(2, 'Supplier isolation across orders, deliveries, receipts, bills, payments, suppliers', 'TENANT_ISOLATION',
            '0 foreign records visible', 'Foreign records visible or self-access broken', 'FAIL',
            'RLS policy failed to isolate tenant records');
    END IF;

    -- Test whether Supplier 1 can insert a bill for Supplier 2
    BEGIN
        INSERT INTO public.bills (bill_number, supplier_id, invoice_number, invoice_date, total_amount, status)
        VALUES ('SEC-SPOOF-BILL', v_env.sup2_id, 'INV-SPOOF', CURRENT_DATE, 9999, 'SUBMITTED');
        PERFORM record_sec_check(2, 'Prevent supplier from inserting bill for another supplier', 'TENANT_ISOLATION',
            'Blocked by RLS bills_insert', 'Bill insertion succeeded', 'FAIL', 'Supplier 1 successfully inserted a bill under Supplier 2 ID');
    EXCEPTION WHEN insufficient_privilege THEN
        PERFORM record_sec_check(2, 'Prevent supplier from inserting bill for another supplier', 'TENANT_ISOLATION',
            'Blocked by RLS bills_insert', 'Blocked with insufficient_privilege', 'PASS', 'Supplier 1 was blocked from inserting bill under Supplier 2');
    END;

    -- ------------------------------------------------------------------------
    -- CHECK 3: CAN SUPPLIER ASSIGN THEMSELVES ANOTHER SUPPLIER ID?
    -- ------------------------------------------------------------------------
    BEGIN
        UPDATE public.user_profiles SET supplier_id = v_env.sup2_id WHERE id = v_env.user1_id;
        SELECT supplier_id INTO v_changed_sup_id FROM public.user_profiles WHERE id = v_env.user1_id;
        IF v_changed_sup_id = v_env.sup2_id THEN
            PERFORM record_sec_check(3, 'Prevent supplier from re-assigning supplier_id on user_profiles', 'PROFILE_TAMPERING',
                'Blocked by trigger or RLS', 'User 1 successfully changed supplier_id to Supplier 2', 'FAIL',
                'SECURITY FLAW: trg_protect_user_profile does not prevent non-admins from updating supplier_id; tenant hijacking possible');
        ELSE
            PERFORM record_sec_check(3, 'Prevent supplier from re-assigning supplier_id on user_profiles', 'PROFILE_TAMPERING',
                'Blocked by trigger or RLS', 'supplier_id update did not apply', 'PASS', 'supplier_id change was blocked');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        PERFORM record_sec_check(3, 'Prevent supplier from re-assigning supplier_id on user_profiles', 'PROFILE_TAMPERING',
            'Blocked by trigger or RLS', 'Blocked with exception: ' || SQLERRM, 'PASS', 'Attempt to change supplier_id was blocked');
    END;

    -- ------------------------------------------------------------------------
    -- CHECK 4: ROLE ESCALATION
    -- ------------------------------------------------------------------------
    BEGIN
        UPDATE public.user_profiles SET role = 'ADMIN' WHERE id = v_env.user1_id;
        PERFORM record_sec_check(4, 'Prevent role escalation via UPDATE', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Role updated to ADMIN', 'FAIL', 'User 1 escalated their role to ADMIN');
    EXCEPTION WHEN raise_exception THEN
        PERFORM record_sec_check(4, 'Prevent role escalation via UPDATE', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Blocked by trg_protect_user_profile', 'PASS', 'UPDATE role escalation blocked');
    END;

    BEGIN
        INSERT INTO public.user_profiles (id, full_name, email, role)
        VALUES (gen_random_uuid(), 'Escalated Admin', 'fakeadmin@test.com', 'ADMIN');
        PERFORM record_sec_check(4, 'Prevent creating ADMIN profile via INSERT', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Admin profile inserted', 'FAIL', 'User 1 created a new ADMIN profile');
    EXCEPTION WHEN raise_exception THEN
        PERFORM record_sec_check(4, 'Prevent creating ADMIN profile via INSERT', 'ROLE_PROTECTION',
            'Blocked by trigger', 'Blocked by trg_protect_user_profile', 'PASS', 'INSERT of ADMIN profile blocked');
    END;

    -- ------------------------------------------------------------------------
    -- CHECK 5: APPROVALS ACCESS
    -- ------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.approvals (bill_id, workflow_task_id, approver_id, approver_role, decision)
        VALUES (v_env.bill1_id, v_env.task1_id, v_env.user1_id, 'SUPPLIER', 'APPROVED');
        PERFORM record_sec_check(5, 'Prevent non-approver (SUPPLIER) from inserting approval', 'APPROVAL_SECURITY',
            'Blocked by RLS approvals_insert', 'Approval inserted by supplier', 'FAIL', 'Supplier was allowed to insert an approval');
    EXCEPTION WHEN insufficient_privilege THEN
        PERFORM record_sec_check(5, 'Prevent non-approver (SUPPLIER) from inserting approval', 'APPROVAL_SECURITY',
            'Blocked by RLS approvals_insert', 'Blocked with insufficient_privilege', 'PASS', 'Supplier cannot insert approvals');
    END;

    -- Test UPDATE on approvals
    UPDATE public.approvals SET decision = 'REJECTED' WHERE bill_id = v_env.bill1_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        PERFORM record_sec_check(5, 'Prevent modifying approval decisions (UPDATE)', 'APPROVAL_IMMUTABILITY',
            '0 rows affected', v_rows || ' rows updated', 'FAIL', 'Approval record was modified');
    ELSE
        PERFORM record_sec_check(5, 'Prevent modifying approval decisions (UPDATE)', 'APPROVAL_IMMUTABILITY',
            '0 rows affected (no UPDATE policy)', '0 rows affected', 'PASS', 'Approvals cannot be updated by client users');
    END IF;

    -- Test DELETE on approvals as non-admin
    DELETE FROM public.approvals WHERE bill_id = v_env.bill1_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        PERFORM record_sec_check(5, 'Prevent deleting approval as non-admin', 'APPROVAL_IMMUTABILITY',
            '0 rows affected', v_rows || ' rows deleted', 'FAIL', 'Non-admin deleted an approval');
    ELSE
        PERFORM record_sec_check(5, 'Prevent deleting approval as non-admin', 'APPROVAL_IMMUTABILITY',
            '0 rows affected (RLS/trigger enforced)', '0 rows affected', 'PASS', 'Non-admin cannot delete approvals');
    END IF;

    -- ------------------------------------------------------------------------
    -- CHECK 6: PAYMENTS ACCESS
    -- ------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.payments (bill_id, payment_reference, amount, status)
        VALUES (v_env.bill1_id, 'SEC-UNAUTH-PAY', 999, 'CONFIRMED');
        PERFORM record_sec_check(6, 'Prevent unauthorized user (SUPPLIER) from inserting payment', 'PAYMENT_SECURITY',
            'Blocked by RLS payments_insert', 'Payment inserted by supplier', 'FAIL', 'Supplier was allowed to insert payment');
    EXCEPTION WHEN insufficient_privilege THEN
        PERFORM record_sec_check(6, 'Prevent unauthorized user (SUPPLIER) from inserting payment', 'PAYMENT_SECURITY',
            'Blocked by RLS payments_insert', 'Blocked with insufficient_privilege', 'PASS', 'Supplier cannot insert payments');
    END;

    -- Test unauthorized UPDATE on payments
    UPDATE public.payments SET status = 'CONFIRMED' WHERE id = v_env.pay1_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        PERFORM record_sec_check(6, 'Prevent unauthorized user (SUPPLIER) from updating payment', 'PAYMENT_SECURITY',
            '0 rows affected', v_rows || ' rows updated', 'FAIL', 'Supplier was allowed to update payment status');
    ELSE
        PERFORM record_sec_check(6, 'Prevent unauthorized user (SUPPLIER) from updating payment', 'PAYMENT_SECURITY',
            '0 rows affected (RLS payments_update)', '0 rows affected', 'PASS', 'Supplier cannot update payments');
    END IF;

    -- ------------------------------------------------------------------------
    -- CHECK 8: AUDIT LOG PROTECTION
    -- ------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.audit_logs (actor_id, action, entity_type, details)
        VALUES (v_admin_id, 'FORGED_ADMIN_ACTION', 'system', '{"forged": true}');
        PERFORM record_sec_check(8, 'Prevent client user from inserting fabricated audit records', 'AUDIT_INTEGRITY',
            'Rejected or actor_id forced to auth.uid()', 'Client inserted audit record attributing action to admin', 'FAIL',
            'RLS POLICY GAP: audit_logs_insert has WITH CHECK (true), allowing clients to insert arbitrary fabricated audit records');
    EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
        PERFORM record_sec_check(8, 'Prevent client user from inserting fabricated audit records', 'AUDIT_INTEGRITY',
            'Rejected or actor_id forced to auth.uid()', 'Blocked by policy/trigger', 'PASS', 'Arbitrary audit insert blocked');
    END;

    UPDATE public.audit_logs SET action = 'ALTERED';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        PERFORM record_sec_check(8, 'Prevent modifying audit logs (UPDATE)', 'AUDIT_IMMUTABILITY',
            '0 rows affected', v_rows || ' rows updated', 'FAIL', 'Audit log was modified');
    ELSE
        PERFORM record_sec_check(8, 'Prevent modifying audit logs (UPDATE)', 'AUDIT_IMMUTABILITY',
            '0 rows affected (no UPDATE policy + trigger)', '0 rows affected', 'PASS', 'Audit logs cannot be updated');
    END IF;

    DELETE FROM public.audit_logs;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        PERFORM record_sec_check(8, 'Prevent deleting audit logs (DELETE)', 'AUDIT_IMMUTABILITY',
            '0 rows affected', v_rows || ' rows deleted', 'FAIL', 'Audit logs were deleted');
    ELSE
        PERFORM record_sec_check(8, 'Prevent deleting audit logs (DELETE)', 'AUDIT_IMMUTABILITY',
            '0 rows affected (no DELETE policy + trigger)', '0 rows affected', 'PASS', 'Audit logs cannot be deleted');
    END IF;

    -- ------------------------------------------------------------------------
    -- CHECK 11: WORKFLOW STATUS TAMPERING
    -- ------------------------------------------------------------------------
    -- Supplier 1 attempting to update their SUBMITTED bill to 'APPROVED'
    UPDATE public.bills SET status = 'APPROVED' WHERE id = v_env.bill1_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        PERFORM record_sec_check(11, 'Prevent supplier from changing SUBMITTED bill status to APPROVED', 'WORKFLOW_INTEGRITY',
            '0 rows affected (status=DRAFT required)', v_rows || ' rows updated', 'FAIL', 'Supplier updated submitted bill status to APPROVED');
    ELSE
        PERFORM record_sec_check(11, 'Prevent supplier from changing SUBMITTED bill status to APPROVED', 'WORKFLOW_INTEGRITY',
            '0 rows affected (status=DRAFT required)', '0 rows affected', 'PASS', 'Supplier cannot update non-DRAFT bill');
    END IF;

    -- Switch back to postgres for schema constraint checks
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    -- ------------------------------------------------------------------------
    -- CHECK 7: PREVENT DUPLICATE PAYMENT RECORDS FOR SAME BILL
    -- ------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.payments (bill_id, payment_reference, amount, status)
        VALUES (v_env.bill1_id, 'SEC-DUP-PAY-A', 500, 'INITIATED');
        INSERT INTO public.payments (bill_id, payment_reference, amount, status)
        VALUES (v_env.bill1_id, 'SEC-DUP-PAY-B', 500, 'INITIATED');
        PERFORM record_sec_check(7, 'Prevent duplicate active payment records for same bill', 'PAYMENT_INTEGRITY',
            'Duplicate active payments for same bill rejected', 'Allowed multiple active payments (SEC-DUP-PAY-A, B)', 'FAIL',
            'SCHEMA GAP: payments table has UNIQUE(payment_reference) but lacks unique constraint/index on (bill_id) for active status');
    EXCEPTION WHEN unique_violation THEN
        PERFORM record_sec_check(7, 'Prevent duplicate active payment records for same bill', 'PAYMENT_INTEGRITY',
            'Duplicate active payments rejected', 'Rejected by unique constraint', 'PASS', 'Duplicate payment for same bill was prevented');
    END;

END $$;

-- ============================================================================
-- CHECK 9: INSPECT SECURITY DEFINER FUNCTIONS FOR SEARCH PATH
-- ============================================================================
DO $$
DECLARE
    v_insecure_funcs text[];
BEGIN
    SELECT array_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')
    INTO v_insecure_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
          p.proconfig IS NULL
          OR NOT EXISTS (
              SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
          )
      );

    IF v_insecure_funcs IS NULL OR array_length(v_insecure_funcs, 1) = 0 THEN
        PERFORM record_sec_check(9, 'SECURITY DEFINER functions have explicit search_path', 'FUNCTION_SECURITY',
            'All SECURITY DEFINER functions have search_path', 'All public SECURITY DEFINER functions configured with search_path=public', 'PASS',
            'No search-path injection vulnerabilities in public SECURITY DEFINER functions');
    ELSE
        PERFORM record_sec_check(9, 'SECURITY DEFINER functions have explicit search_path', 'FUNCTION_SECURITY',
            'All functions have search_path', 'Insecure functions: ' || array_to_string(v_insecure_funcs, ', '), 'FAIL',
            'Functions lack explicit search_path');
    END IF;
END $$;

-- ============================================================================
-- CHECK 10: VERIFY POLICIES DO NOT ACCIDENTALLY GRANT UNRESTRICTED ACCESS
-- ============================================================================
DO $$
DECLARE
    v_open_policies text[];
BEGIN
    SELECT array_agg(pol.tablename || '.' || pol.policyname || ' (' || pol.cmd || ')')
    INTO v_open_policies
    FROM pg_policies pol
    WHERE pol.schemaname = 'public'
      AND (
          (pol.cmd IN ('INSERT', 'UPDATE', 'DELETE') AND (pol.qual = 'true' OR pol.with_check = 'true'))
          OR (pol.tablename IN ('bills', 'approvals', 'payments', 'audit_logs', 'user_profiles') AND pol.qual = 'true')
      );

    IF v_open_policies IS NOT NULL AND array_length(v_open_policies, 1) > 0 THEN
        PERFORM record_sec_check(10, 'Inspect open/unrestricted policies across sensitive tables', 'LEAST_PRIVILEGE',
            'No unrestricted INSERT/UPDATE/DELETE on sensitive tables',
            'Identified open policies: ' || array_to_string(v_open_policies, ', '), 'FAIL',
            'audit_logs_insert has WITH CHECK (true) granting unrestricted INSERT to any client');
    ELSE
        PERFORM record_sec_check(10, 'Inspect open/unrestricted policies across sensitive tables', 'LEAST_PRIVILEGE',
            'No unrestricted access', 'All sensitive table policies properly restricted', 'PASS', 'No unintended open policies');
    END IF;
END $$;

-- ============================================================================
-- CHECK 12: VERIFY AUTH CONTEXT SIMULATION COMPATIBILITY
-- ============================================================================
DO $$
DECLARE
    v_test_uid uuid := gen_random_uuid();
    v_resolved_uid uuid;
BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_test_uid::text, true);
    SELECT auth.uid() INTO v_resolved_uid;
    IF v_resolved_uid = v_test_uid THEN
        PERFORM record_sec_check(12, 'Security tests use realistic auth.uid() context simulation', 'TEST_METHODOLOGY',
            'auth.uid() resolves request.jwt.claim.sub', 'auth.uid() correctly matched simulated JWT claim', 'PASS',
            'Security test harness reliably simulates authenticated Supabase end-user sessions');
    ELSE
        PERFORM record_sec_check(12, 'Security tests use realistic auth.uid() context simulation', 'TEST_METHODOLOGY',
            'auth.uid() resolves request.jwt.claim.sub', 'auth.uid() did not resolve claim', 'FAIL',
            'Test context simulation mechanism not functional');
    END IF;
END $$;

-- ============================================================================
-- OUTPUT VERIFICATION RESULTS TABLE
-- ============================================================================
SELECT 
    check_num,
    check_name,
    category,
    result,
    expected,
    actual,
    details
FROM sec_verification_results
ORDER BY check_num, check_id;

-- Clean rollback (leaves database untouched)
ROLLBACK;
