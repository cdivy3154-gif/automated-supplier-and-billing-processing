-- ============================================================================
-- VALIDATION TEST SUITE FOR MIGRATION 20230915000500_approval_workflow_and_payments.sql
-- ============================================================================
-- Executes inside an isolated transaction and automatically rolls back at completion.
-- Safe to run in Supabase SQL editor or CLI against any development or staging environment.
-- ============================================================================

BEGIN;

CREATE TEMPORARY TABLE mig005_test_results (
    test_id serial PRIMARY KEY,
    test_name text NOT NULL,
    category text NOT NULL,
    expected text NOT NULL,
    actual text NOT NULL,
    result text NOT NULL,
    details text
);

CREATE OR REPLACE FUNCTION record_mig005_test(
    p_name text,
    p_cat text,
    p_exp text,
    p_act text,
    p_res text,
    p_det text
) RETURNS void AS $$
BEGIN
    INSERT INTO mig005_test_results (test_name, category, expected, actual, result, details)
    VALUES (p_name, p_cat, p_exp, p_act, p_res, p_det);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 1. APPLY MIGRATION 20230915000500 IN-TRANSACTION
-- ============================================================================

-- (Functions from 20230915000500_approval_workflow_and_payments.sql are defined here)
\i supabase/migrations/20230915000500_approval_workflow_and_payments.sql

-- ============================================================================
-- 2. TEST FULL APPROVAL WORKFLOW AND SIMULATED PAYMENTS
-- ============================================================================

DO $$
DECLARE
    v_supp_id uuid;
    v_godown_id uuid;
    v_order_id uuid;
    v_deliv_id uuid;
    v_rcpt_id uuid;
    v_branch_user uuid;
    v_preaudit_user uuid;
    v_gm_user uuid;
    v_finance_user uuid;
    v_supplier_user uuid;
    v_bill_res jsonb;
    v_bill_id uuid;
    v_task1_id uuid;
    v_task2_id uuid;
    v_task3_id uuid;
    v_task4_id uuid;
    v_appr_res jsonb;
    v_pay_res jsonb;
    v_pay_id uuid;
    v_pay_sim jsonb;
    v_bill_status text;
BEGIN
    -- Fetch test users
    SELECT id INTO v_supp_id FROM public.suppliers LIMIT 1;
    SELECT id INTO v_godown_id FROM public.godowns LIMIT 1;

    SELECT id INTO v_supplier_user FROM public.user_profiles WHERE role = 'SUPPLIER' LIMIT 1;
    SELECT id INTO v_branch_user FROM public.user_profiles WHERE role = 'BRANCH_OFFICER' LIMIT 1;
    SELECT id INTO v_preaudit_user FROM public.user_profiles WHERE role = 'PRE_AUDITOR' LIMIT 1;
    SELECT id INTO v_gm_user FROM public.user_profiles WHERE role = 'GENERAL_MANAGER' LIMIT 1;
    SELECT id INTO v_finance_user FROM public.user_profiles WHERE role = 'FINANCE_OFFICER' LIMIT 1;

    -- Setup order and verified delivery
    INSERT INTO public.supply_orders (
        order_number, supplier_id, godown_id, commodity_name, ordered_quantity, unit, agreed_rate, order_date, status
    ) VALUES (
        'ORD-PHASE2C-TEST', v_supp_id, v_godown_id, 'Phase 2C Wheat', 100.0, 'MT', 25.0, CURRENT_DATE, 'AUTHORIZED'
    ) RETURNING id INTO v_order_id;

    INSERT INTO public.deliveries (
        delivery_number, supply_order_id, delivered_quantity, delivery_date, status
    ) VALUES (
        'DEL-PHASE2C-TEST', v_order_id, 50.0, CURRENT_DATE, 'DELIVERED'
    ) RETURNING id INTO v_deliv_id;

    INSERT INTO public.delivery_receipts (receipt_number, delivery_id, status)
    VALUES ('RCPT-PHASE2C-TEST', v_deliv_id, 'ISSUED')
    RETURNING id INTO v_rcpt_id;

    -- 1. Supplier submits bill -> initial task created for BRANCH_OFFICER
    v_bill_res := public.submit_bill_atomic(
        'INV-PHASE2C-001',
        CURRENT_DATE,
        jsonb_build_array(jsonb_build_object('delivery_id', v_deliv_id, 'billed_quantity', 50.0, 'rate', 25.0)),
        v_supp_id,
        v_supplier_user
    );
    v_bill_id := (v_bill_res->>'id')::uuid;

    SELECT id INTO v_task1_id FROM public.workflow_tasks
    WHERE bill_id = v_bill_id AND assigned_role = 'BRANCH_OFFICER' AND status = 'PENDING';

    IF v_task1_id IS NOT NULL THEN
        PERFORM record_mig005_test('Stage 0: Initial task for BRANCH_OFFICER', 'SUBMISSION', 'PENDING', 'PENDING', 'PASS', 'Task initialized for Branch Officer');
    ELSE
        PERFORM record_mig005_test('Stage 0: Initial task for BRANCH_OFFICER', 'SUBMISSION', 'PENDING', 'NULL', 'FAIL', 'No initial Branch Officer task');
    END IF;

    -- 2. Stage 1: Branch Officer reviews and approves
    v_appr_res := public.process_approval_atomic(v_task1_id, 'APPROVED', 'Branch procurement verified', v_branch_user);
    v_task2_id := (v_appr_res->>'next_task_id')::uuid;

    SELECT status INTO v_bill_status FROM public.bills WHERE id = v_bill_id;
    IF v_bill_status = 'BRANCH_APPROVED' AND v_appr_res->>'next_role' = 'PRE_AUDITOR' THEN
        PERFORM record_mig005_test('Stage 1: Branch Officer approval', 'APPROVAL', 'BRANCH_APPROVED', v_bill_status, 'PASS', 'Bill transitioned to BRANCH_APPROVED and PRE_AUDITOR task created');
    ELSE
        PERFORM record_mig005_test('Stage 1: Branch Officer approval', 'APPROVAL', 'BRANCH_APPROVED', v_bill_status, 'FAIL', 'Unexpected branch approval transition');
    END IF;

    -- 3. Stage 2: Pre-Auditor verifies
    v_appr_res := public.process_approval_atomic(v_task2_id, 'APPROVED', 'Audit arithmetic and receipts verified', v_preaudit_user);
    v_task3_id := (v_appr_res->>'next_task_id')::uuid;

    SELECT status INTO v_bill_status FROM public.bills WHERE id = v_bill_id;
    IF v_bill_status = 'PRE_AUDITED' AND v_appr_res->>'next_role' = 'GENERAL_MANAGER' THEN
        PERFORM record_mig005_test('Stage 2: Pre-Auditor verification', 'APPROVAL', 'PRE_AUDITED', v_bill_status, 'PASS', 'Bill transitioned to PRE_AUDITED and GENERAL_MANAGER task created');
    ELSE
        PERFORM record_mig005_test('Stage 2: Pre-Auditor verification', 'APPROVAL', 'PRE_AUDITED', v_bill_status, 'FAIL', 'Unexpected pre-audit transition');
    END IF;

    -- 4. Stage 3: General Manager approves
    v_appr_res := public.process_approval_atomic(v_task3_id, 'APPROVED', 'Executive expenditure approved', v_gm_user);
    v_task4_id := (v_appr_res->>'next_task_id')::uuid;

    SELECT status INTO v_bill_status FROM public.bills WHERE id = v_bill_id;
    IF v_bill_status = 'GM_APPROVED' AND v_appr_res->>'next_role' = 'FINANCE_OFFICER' THEN
        PERFORM record_mig005_test('Stage 3: General Manager approval', 'APPROVAL', 'GM_APPROVED', v_bill_status, 'PASS', 'Bill transitioned to GM_APPROVED and FINANCE_OFFICER task created');
    ELSE
        PERFORM record_mig005_test('Stage 3: General Manager approval', 'APPROVAL', 'GM_APPROVED', v_bill_status, 'FAIL', 'Unexpected GM approval transition');
    END IF;

    -- 5. Stage 4: Finance Officer clears
    v_appr_res := public.process_approval_atomic(v_task4_id, 'APPROVED', 'Disbursement clearance authorized', v_finance_user);

    SELECT status INTO v_bill_status FROM public.bills WHERE id = v_bill_id;
    IF v_bill_status = 'APPROVED' THEN
        PERFORM record_mig005_test('Stage 4: Finance Officer clearance', 'APPROVAL', 'APPROVED', v_bill_status, 'PASS', 'Bill reached final APPROVED status');
    ELSE
        PERFORM record_mig005_test('Stage 4: Finance Officer clearance', 'APPROVAL', 'APPROVED', v_bill_status, 'FAIL', 'Bill failed to reach APPROVED status');
    END IF;

    -- 6. Stage 5: Payment Initiation
    v_pay_res := public.initiate_payment_atomic(v_bill_id, 'TEST-PAY-001', v_finance_user);
    v_pay_id := (v_pay_res->>'id')::uuid;

    SELECT status INTO v_bill_status FROM public.bills WHERE id = v_bill_id;
    IF v_bill_status = 'PAYMENT_PENDING' AND v_pay_res->>'status' = 'INITIATED' THEN
        PERFORM record_mig005_test('Stage 5: Payment initiation', 'PAYMENTS', 'PAYMENT_PENDING', v_bill_status, 'PASS', 'Payment record created and bill marked PAYMENT_PENDING');
    ELSE
        PERFORM record_mig005_test('Stage 5: Payment initiation', 'PAYMENTS', 'PAYMENT_PENDING', v_bill_status, 'FAIL', 'Unexpected payment initiation state');
    END IF;

    -- 7. Stage 6: Payment Simulation SUCCESS -> Bill PAID
    v_pay_sim := public.simulate_payment_status_atomic(v_pay_id, 'SUCCESS', v_finance_user);

    SELECT status INTO v_bill_status FROM public.bills WHERE id = v_bill_id;
    IF v_bill_status = 'PAID' AND v_pay_sim->>'status' = 'SUCCESS' THEN
        PERFORM record_mig005_test('Stage 6: Simulated payment SUCCESS', 'PAYMENTS', 'PAID', v_bill_status, 'PASS', 'Bill marked PAID with confirmed payment');
    ELSE
        PERFORM record_mig005_test('Stage 6: Simulated payment SUCCESS', 'PAYMENTS', 'PAID', v_bill_status, 'FAIL', 'Unexpected payment success state');
    END IF;

END $$;

SELECT test_id, category, test_name, expected, actual, result, details
FROM mig005_test_results
ORDER BY test_id;

ROLLBACK;
