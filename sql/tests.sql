-- ============================================================================
-- AUTOMATED STATE COMMODITY SUPPLIER BILLING & PAYMENT PROCESSING
-- DATABASE TEST SUITE (sql/tests.sql)
-- ============================================================================
-- This test script validates constraints, foreign keys, triggers, and RLS rules.
-- Run using: psql "$DATABASE_URL" -f sql/tests.sql
-- ============================================================================

-- Pure PostgreSQL compatible test runner

BEGIN;

CREATE TEMPORARY TABLE test_results (
    test_id serial PRIMARY KEY,
    test_name text NOT NULL,
    category text NOT NULL,
    expected_status text NOT NULL,
    actual_status text NOT NULL,
    details text
);

-- Helper function to record test results
CREATE OR REPLACE FUNCTION record_test(
    p_name text,
    p_category text,
    p_expected text,
    p_actual text,
    p_details text
) RETURNS void AS $$
BEGIN
    INSERT INTO test_results (test_name, category, expected_status, actual_status, details)
    VALUES (p_name, p_category, p_expected, p_actual, p_details);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TEST SUITE 1: NUMERIC & CHECK CONSTRAINTS
-- ============================================================================

-- Test 1.1: Reject zero or negative ordered_quantity
DO $$
BEGIN
    INSERT INTO public.supply_orders (
        order_number, supplier_id, godown_id, commodity_name,
        ordered_quantity, unit, agreed_rate, order_date, status
    ) VALUES (
        'TEST-ORD-NEG-QTY',
        (SELECT id FROM public.suppliers LIMIT 1),
        (SELECT id FROM public.godowns LIMIT 1),
        'Wheat',
        -10, 'kg', 25.0, CURRENT_DATE, 'DRAFT'
    );
    PERFORM record_test('Reject negative ordered_quantity', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed negative ordered_quantity');
EXCEPTION WHEN check_violation THEN
    PERFORM record_test('Reject negative ordered_quantity', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'PASSED', 'Successfully rejected negative ordered_quantity');
END $$;

-- Test 1.2: Reject negative agreed_rate
DO $$
BEGIN
    INSERT INTO public.supply_orders (
        order_number, supplier_id, godown_id, commodity_name,
        ordered_quantity, unit, agreed_rate, order_date, status
    ) VALUES (
        'TEST-ORD-NEG-RATE',
        (SELECT id FROM public.suppliers LIMIT 1),
        (SELECT id FROM public.godowns LIMIT 1),
        'Wheat',
        100, 'kg', -5.0, CURRENT_DATE, 'DRAFT'
    );
    PERFORM record_test('Reject negative agreed_rate', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed negative agreed_rate');
EXCEPTION WHEN check_violation THEN
    PERFORM record_test('Reject negative agreed_rate', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'PASSED', 'Successfully rejected negative agreed_rate');
END $$;

-- Test 1.3: Reject negative total_amount on bills
DO $$
BEGIN
    INSERT INTO public.bills (
        bill_number, supplier_id, invoice_number, invoice_date, total_amount, status
    ) VALUES (
        'TEST-BILL-NEG-AMT',
        (SELECT id FROM public.suppliers LIMIT 1),
        'INV-TEST-NEG',
        CURRENT_DATE,
        -500.0,
        'SUBMITTED'
    );
    PERFORM record_test('Reject negative bill total_amount', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed negative total_amount');
EXCEPTION WHEN check_violation THEN
    PERFORM record_test('Reject negative bill total_amount', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'PASSED', 'Successfully rejected negative total_amount');
END $$;

-- Test 1.4: Reject invalid user role value
DO $$
BEGIN
    INSERT INTO public.user_profiles (
        email, full_name, role
    ) VALUES (
        'invalid_role@test.com', 'Hacker User', 'SUPER_ADMIN'
    );
    PERFORM record_test('Reject unauthorized role name', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed invalid role name');
EXCEPTION WHEN check_violation THEN
    PERFORM record_test('Reject unauthorized role name', 'CHECK_CONSTRAINT', 'FAIL_WITH_CHECK_VIOLATION', 'PASSED', 'Successfully rejected invalid role name');
END $$;

-- ============================================================================
-- TEST SUITE 2: UNIQUENESS CONSTRAINTS
-- ============================================================================

-- Test 2.1: Reject duplicate delivery receipt_number
DO $$
DECLARE
    v_del_id uuid;
BEGIN
    SELECT id INTO v_del_id FROM public.deliveries LIMIT 1;
    INSERT INTO public.delivery_receipts (receipt_number, delivery_id, status)
    VALUES ('RCPT-UNIQUE-TEST', v_del_id, 'ISSUED');
    
    -- Attempt duplicate
    INSERT INTO public.delivery_receipts (receipt_number, delivery_id, status)
    VALUES ('RCPT-UNIQUE-TEST', v_del_id, 'ISSUED');
    
    PERFORM record_test('Reject duplicate receipt_number', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed duplicate receipt_number');
EXCEPTION WHEN unique_violation THEN
    PERFORM record_test('Reject duplicate receipt_number', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'PASSED', 'Successfully rejected duplicate receipt_number');
END $$;

-- Test 2.2: Reject duplicate invoice_number for the same supplier
DO $$
DECLARE
    v_sup_id uuid;
BEGIN
    SELECT id INTO v_sup_id FROM public.suppliers LIMIT 1;
    INSERT INTO public.bills (bill_number, supplier_id, invoice_number, invoice_date, total_amount, status)
    VALUES ('BILL-DUP-1', v_sup_id, 'INV-DUP-TEST', CURRENT_DATE, 1000, 'SUBMITTED');
    
    -- Attempt duplicate invoice for same supplier
    INSERT INTO public.bills (bill_number, supplier_id, invoice_number, invoice_date, total_amount, status)
    VALUES ('BILL-DUP-2', v_sup_id, 'INV-DUP-TEST', CURRENT_DATE, 2000, 'SUBMITTED');
    
    PERFORM record_test('Reject duplicate invoice_number per supplier', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed duplicate invoice_number for same supplier');
EXCEPTION WHEN unique_violation THEN
    PERFORM record_test('Reject duplicate invoice_number per supplier', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'PASSED', 'Successfully rejected duplicate invoice_number for same supplier');
END $$;

-- Test 2.3: Reject duplicate payment_reference
DO $$
DECLARE
    v_bill_id uuid;
BEGIN
    SELECT id INTO v_bill_id FROM public.bills LIMIT 1;
    INSERT INTO public.payments (bill_id, payment_reference, amount, status)
    VALUES (v_bill_id, 'PAY-REF-UNIQUE-TEST', 500, 'INITIATED');
    
    -- Attempt duplicate payment reference
    INSERT INTO public.payments (bill_id, payment_reference, amount, status)
    VALUES (v_bill_id, 'PAY-REF-UNIQUE-TEST', 500, 'INITIATED');
    
    PERFORM record_test('Reject duplicate payment_reference', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed duplicate payment_reference');
EXCEPTION WHEN unique_violation THEN
    PERFORM record_test('Reject duplicate payment_reference', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'PASSED', 'Successfully rejected duplicate payment_reference');
END $$;

-- Test 2.4: Reject duplicate bill_deliveries junction association
DO $$
DECLARE
    v_bill_id uuid;
    v_del_id uuid;
BEGIN
    SELECT id INTO v_bill_id FROM public.bills LIMIT 1;
    SELECT id INTO v_del_id FROM public.deliveries LIMIT 1;
    INSERT INTO public.bill_deliveries (bill_id, delivery_id, billed_quantity, rate, amount)
    VALUES (v_bill_id, v_del_id, 10, 10, 100);
    
    -- Attempt duplicate association
    INSERT INTO public.bill_deliveries (bill_id, delivery_id, billed_quantity, rate, amount)
    VALUES (v_bill_id, v_del_id, 10, 10, 100);
    
    PERFORM record_test('Reject duplicate bill_deliveries association', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed duplicate bill_delivery pair');
EXCEPTION WHEN unique_violation THEN
    PERFORM record_test('Reject duplicate bill_deliveries association', 'UNIQUE_CONSTRAINT', 'FAIL_WITH_UNIQUE_VIOLATION', 'PASSED', 'Successfully rejected duplicate bill_delivery pair');
END $$;

-- ============================================================================
-- TEST SUITE 3: FOREIGN KEY INTEGRITY
-- ============================================================================

-- Test 3.1: Reject supply_order with nonexistent supplier
DO $$
BEGIN
    INSERT INTO public.supply_orders (
        order_number, supplier_id, godown_id, commodity_name,
        ordered_quantity, unit, agreed_rate, order_date, status
    ) VALUES (
        'TEST-ORD-INVALID-FK',
        '00000000-0000-0000-0000-000000000000',
        (SELECT id FROM public.godowns LIMIT 1),
        'Wheat', 100, 'kg', 25.0, CURRENT_DATE, 'DRAFT'
    );
    PERFORM record_test('Reject supply_order with nonexistent supplier', 'FOREIGN_KEY', 'FAIL_WITH_FK_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed invalid supplier foreign key');
EXCEPTION WHEN foreign_key_violation THEN
    PERFORM record_test('Reject supply_order with nonexistent supplier', 'FOREIGN_KEY', 'FAIL_WITH_FK_VIOLATION', 'PASSED', 'Successfully rejected invalid supplier foreign key');
END $$;

-- Test 3.2: Prevent CASCADE deletion of supplier with existing supply orders
DO $$
DECLARE
    v_sup_id uuid;
BEGIN
    SELECT supplier_id INTO v_sup_id FROM public.supply_orders LIMIT 1;
    DELETE FROM public.suppliers WHERE id = v_sup_id;
    PERFORM record_test('Prevent cascade delete of active supplier', 'FOREIGN_KEY_RESTRICT', 'FAIL_WITH_FK_VIOLATION', 'UNEXPECTED_SUCCESS', 'Allowed deleting supplier with orders');
EXCEPTION WHEN foreign_key_violation THEN
    PERFORM record_test('Prevent cascade delete of active supplier', 'FOREIGN_KEY_RESTRICT', 'FAIL_WITH_FK_VIOLATION', 'PASSED', 'Successfully prevented deleting supplier with active supply orders (RESTRICT enforced)');
END $$;

-- ============================================================================
-- TEST SUITE 4: SECURITY & IMMUTABILITY TRIGGERS
-- ============================================================================

-- Test 4.1: Protect audit_logs from modification (UPDATE)
DO $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO public.audit_logs (action, entity_type) VALUES ('TEST_ACTION', 'test') RETURNING id INTO v_log_id;
    UPDATE public.audit_logs SET action = 'TAMPERED_ACTION' WHERE id = v_log_id;
    PERFORM record_test('Protect audit_logs from UPDATE', 'IMMUTABILITY_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'UNEXPECTED_SUCCESS', 'Allowed updating audit log');
EXCEPTION WHEN raise_exception THEN
    PERFORM record_test('Protect audit_logs from UPDATE', 'IMMUTABILITY_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'PASSED', 'Successfully prevented UPDATE on audit_logs');
END $$;

-- Test 4.2: Protect audit_logs from deletion (DELETE)
DO $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO public.audit_logs (action, entity_type) VALUES ('TEST_ACTION_DEL', 'test') RETURNING id INTO v_log_id;
    DELETE FROM public.audit_logs WHERE id = v_log_id;
    PERFORM record_test('Protect audit_logs from DELETE', 'IMMUTABILITY_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'UNEXPECTED_SUCCESS', 'Allowed deleting audit log');
EXCEPTION WHEN raise_exception THEN
    PERFORM record_test('Protect audit_logs from DELETE', 'IMMUTABILITY_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'PASSED', 'Successfully prevented DELETE on audit_logs');
END $$;

-- Test 4.3: Protect approvals from alteration (UPDATE)
DO $$
DECLARE
    v_app_id uuid;
BEGIN
    SELECT id INTO v_app_id FROM public.approvals LIMIT 1;
    IF v_app_id IS NOT NULL THEN
        UPDATE public.approvals SET decision = 'REVERSED' WHERE id = v_app_id;
        PERFORM record_test('Protect approvals from UPDATE', 'IMMUTABILITY_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'UNEXPECTED_SUCCESS', 'Allowed updating approval decision');
    ELSE
        PERFORM record_test('Protect approvals from UPDATE', 'IMMUTABILITY_TRIGGER', 'N/A', 'SKIPPED', 'No approval seed row to test update');
    END IF;
EXCEPTION WHEN raise_exception THEN
    PERFORM record_test('Protect approvals from UPDATE', 'IMMUTABILITY_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'PASSED', 'Successfully prevented UPDATE on approvals');
END $$;

-- Test 4.4: Prevent unauthorized role escalation via user_profiles trigger
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    INSERT INTO public.user_profiles (email, full_name, role)
    VALUES ('supplier_test@test.com', 'Test Supplier', 'SUPPLIER')
    RETURNING id INTO v_user_id;
    
    -- Simulate authenticated supplier session (auth.uid() = v_user_id)
    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

    -- Attempt role escalation without admin privilege
    UPDATE public.user_profiles SET role = 'ADMIN' WHERE id = v_user_id;
    PERFORM record_test('Prevent unauthorized role escalation', 'ROLE_PROTECTION_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'UNEXPECTED_SUCCESS', 'Allowed non-admin user role escalation to ADMIN');
EXCEPTION WHEN raise_exception THEN
    PERFORM record_test('Prevent unauthorized role escalation', 'ROLE_PROTECTION_TRIGGER', 'FAIL_WITH_TRIGGER_EXCEPTION', 'PASSED', 'Successfully blocked role escalation attempt');
END $$;

-- ============================================================================
-- OUTPUT TEST SUMMARY
-- ============================================================================
SELECT 
    test_id,
    category,
    test_name,
    expected_status,
    actual_status,
    details
FROM test_results
ORDER BY test_id;

-- Rollback test data insertions so the database remains clean
ROLLBACK;
