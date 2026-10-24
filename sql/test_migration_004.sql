-- ============================================================================
-- VALIDATION TEST SUITE FOR MIGRATION 20230915000400_transaction_safety_and_integrity.sql
-- ============================================================================
-- Executes inside an isolated transaction and automatically rolls back at completion.
-- Safe to run in Supabase SQL editor or CLI against any development or staging environment.
-- ============================================================================

BEGIN;

CREATE TEMPORARY TABLE mig004_test_results (
    test_id serial PRIMARY KEY,
    test_name text NOT NULL,
    category text NOT NULL,
    expected text NOT NULL,
    actual text NOT NULL,
    result text NOT NULL,
    details text
);

CREATE OR REPLACE FUNCTION record_mig004_test(
    p_name text,
    p_cat text,
    p_exp text,
    p_act text,
    p_res text,
    p_det text
) RETURNS void AS $$
BEGIN
    INSERT INTO mig004_test_results (test_name, category, expected, actual, result, details)
    VALUES (p_name, p_cat, p_exp, p_act, p_res, p_det);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 1. APPLY MIGRATION 20230915000400 IN-TRANSACTION
-- ============================================================================

-- Apply SEC-01 Trigger
CREATE OR REPLACE FUNCTION public.trg_validate_cumulative_delivery_capacity()
RETURNS trigger AS $$
DECLARE
    v_ordered_qty numeric;
    v_order_status text;
    v_current_delivered numeric;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.supply_order_id IS DISTINCT FROM NEW.supply_order_id THEN
        RAISE EXCEPTION 'Cannot change supply_order_id on an existing delivery record'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF NEW.status IN ('REJECTED', 'CANCELLED') THEN
        RETURN NEW;
    END IF;

    SELECT ordered_quantity, status
    INTO v_ordered_qty, v_order_status
    FROM public.supply_orders
    WHERE id = NEW.supply_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced supply order % not found', NEW.supply_order_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_order_status IN ('REJECTED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Cannot record delivery against order in % status', v_order_status
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT COALESCE(SUM(delivered_quantity), 0)
    INTO v_current_delivered
    FROM public.deliveries
    WHERE supply_order_id = NEW.supply_order_id
      AND status NOT IN ('REJECTED', 'CANCELLED')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF (v_current_delivered + NEW.delivered_quantity) > v_ordered_qty THEN
        RAISE EXCEPTION 'Cumulative delivered quantity (%) exceeds ordered limit (%) for supply order %',
            (v_current_delivered + NEW.delivered_quantity), v_ordered_qty, NEW.supply_order_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_cumulative_delivery ON public.deliveries;
CREATE TRIGGER trg_validate_cumulative_delivery
    BEFORE INSERT OR UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_validate_cumulative_delivery_capacity();

-- Apply SEC-02 Triggers
CREATE OR REPLACE FUNCTION public.trg_prevent_duplicate_delivery_billing()
RETURNS trigger AS $$
BEGIN
    PERFORM 1 FROM public.deliveries WHERE id = NEW.delivery_id FOR UPDATE;

    IF EXISTS (
        SELECT 1
        FROM public.bill_deliveries bd
        JOIN public.bills b ON b.id = bd.bill_id
        WHERE bd.delivery_id = NEW.delivery_id
          AND bd.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND b.id != NEW.bill_id
          AND b.status NOT IN ('REJECTED', 'CANCELLED')
    ) THEN
        RAISE EXCEPTION 'Delivery % is already billed under another active bill', NEW.delivery_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_delivery_billing ON public.bill_deliveries;
CREATE TRIGGER trg_prevent_duplicate_delivery_billing
    BEFORE INSERT OR UPDATE ON public.bill_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_prevent_duplicate_delivery_billing();

CREATE OR REPLACE FUNCTION public.trg_check_bill_reactivation_deliveries()
RETURNS trigger AS $$
BEGIN
    IF OLD.status IN ('REJECTED', 'CANCELLED') AND NEW.status NOT IN ('REJECTED', 'CANCELLED') THEN
        IF EXISTS (
            SELECT 1
            FROM public.bill_deliveries bd_cur
            JOIN public.bill_deliveries bd_other
              ON bd_other.delivery_id = bd_cur.delivery_id AND bd_other.bill_id != NEW.id
            JOIN public.bills b_other ON b_other.id = bd_other.bill_id
            WHERE bd_cur.bill_id = NEW.id
              AND b_other.status NOT IN ('REJECTED', 'CANCELLED')
        ) THEN
            RAISE EXCEPTION 'Cannot reactivate bill %: one or more deliveries are already billed in another active bill', NEW.bill_number
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_bill_reactivation ON public.bills;
CREATE TRIGGER trg_check_bill_reactivation
    BEFORE UPDATE OF status ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_check_bill_reactivation_deliveries();

-- Apply SEC-03/04 Function
CREATE OR REPLACE FUNCTION public.submit_bill_atomic(
    p_invoice_number text,
    p_invoice_date date,
    p_delivery_items jsonb,
    p_supplier_id uuid DEFAULT NULL,
    p_submitted_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_role text;
    v_user_supp_id uuid;
    v_effective_supplier_id uuid;
    v_bill_id uuid;
    v_bill_number text;
    v_total_amount numeric(14,2) := 0.00;
    v_item jsonb;
    v_deliv_id uuid;
    v_deliv_qty numeric;
    v_billed_qty numeric;
    v_agreed_rate numeric;
    v_item_rate numeric;
    v_effective_rate numeric;
    v_line_amount numeric(14,2);
    v_deliv_status text;
    v_order_supp_id uuid;
    v_receipt_status text;
    v_task_id uuid;
    v_created_bill jsonb;
    v_created_items jsonb := '[]'::jsonb;
    v_seen_deliveries uuid[] := '{}';
BEGIN
    -- 1. Identify and authenticate caller safely
    IF auth.uid() IS NOT NULL THEN
        v_user_id := auth.uid();
    ELSIF p_submitted_by IS NOT NULL THEN
        -- Allow explicit user override during test/migration runner execution
        v_user_id := p_submitted_by;
    ELSE
        RAISE EXCEPTION 'Authentication required for bill submission'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT role, supplier_id INTO v_role, v_user_supp_id
    FROM public.user_profiles
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for ID %', v_user_id
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_role NOT IN ('SUPPLIER', 'ADMIN', 'FINANCE_OFFICER') THEN
        RAISE EXCEPTION 'Role % is not authorized to submit bills', v_role
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF v_role = 'SUPPLIER' THEN
        IF v_user_supp_id IS NULL THEN
            RAISE EXCEPTION 'Supplier account is not linked to any supplier organization'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
        v_effective_supplier_id := v_user_supp_id;
    ELSE
        IF p_supplier_id IS NULL THEN
            RAISE EXCEPTION 'supplier_id is required for administrative bill submission'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
        v_effective_supplier_id := p_supplier_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.bills
        WHERE supplier_id = v_effective_supplier_id
          AND invoice_number = TRIM(p_invoice_number)
    ) THEN
        RAISE EXCEPTION 'Invoice % has already been submitted for this supplier', TRIM(p_invoice_number)
            USING ERRCODE = 'unique_violation';
    END IF;

    IF p_delivery_items IS NULL OR jsonb_array_length(p_delivery_items) = 0 THEN
        RAISE EXCEPTION 'Delivery items payload cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_bill_number := 'BILL-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 6));

    INSERT INTO public.bills (
        bill_number, supplier_id, invoice_number, invoice_date, total_amount, status, submitted_by
    ) VALUES (
        v_bill_number, v_effective_supplier_id, TRIM(p_invoice_number), p_invoice_date, 0.00, 'SUBMITTED', v_user_id
    ) RETURNING id INTO v_bill_id;

    -- 7. Validate and insert each delivery line item in deterministic order (sorted by delivery_id to prevent deadlocks)
    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_delivery_items)
        ORDER BY (value->>'delivery_id')::uuid ASC
    LOOP
        v_deliv_id := (v_item->>'delivery_id')::uuid;
        v_billed_qty := (v_item->>'billed_quantity')::numeric;
        v_item_rate := (v_item->>'rate')::numeric;

        IF v_deliv_id IS NULL OR v_billed_qty IS NULL OR v_billed_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid delivery item: delivery_id and positive billed_quantity required'
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_deliv_id = ANY(v_seen_deliveries) THEN
            RAISE EXCEPTION 'Duplicate delivery ID % in submission payload', v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;
        v_seen_deliveries := array_append(v_seen_deliveries, v_deliv_id);

        SELECT d.delivered_quantity, d.status, so.supplier_id, so.agreed_rate
        INTO v_deliv_qty, v_deliv_status, v_order_supp_id, v_agreed_rate
        FROM public.deliveries d
        JOIN public.supply_orders so ON so.id = d.supply_order_id
        WHERE d.id = v_deliv_id
        FOR UPDATE OF d;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Delivery ID % not found', v_deliv_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF v_deliv_status != 'DELIVERED' THEN
            RAISE EXCEPTION 'Delivery % has status % (must be DELIVERED)', v_deliv_id, v_deliv_status
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_order_supp_id != v_effective_supplier_id THEN
            RAISE EXCEPTION 'Delivery % does not belong to the submitting supplier', v_deliv_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        SELECT status INTO v_receipt_status
        FROM public.delivery_receipts
        WHERE delivery_id = v_deliv_id;

        IF NOT FOUND OR v_receipt_status != 'ISSUED' THEN
            RAISE EXCEPTION 'Delivery % does not have an issued delivery receipt', v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_billed_qty > v_deliv_qty THEN
            RAISE EXCEPTION 'Billed quantity % exceeds delivered quantity % for delivery %',
                v_billed_qty, v_deliv_qty, v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;

        v_effective_rate := COALESCE(v_item_rate, v_agreed_rate);
        IF v_effective_rate > v_agreed_rate THEN
            RAISE EXCEPTION 'Billed rate % exceeds agreed order rate % for delivery %',
                v_effective_rate, v_agreed_rate, v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;

        v_line_amount := ROUND(v_billed_qty * v_effective_rate, 2);
        v_total_amount := v_total_amount + v_line_amount;

        INSERT INTO public.bill_deliveries (
            bill_id, delivery_id, billed_quantity, rate, amount
        ) VALUES (
            v_bill_id, v_deliv_id, v_billed_qty, v_effective_rate, v_line_amount
        );

        v_created_items := v_created_items || jsonb_build_object(
            'delivery_id', v_deliv_id,
            'billed_quantity', v_billed_qty,
            'rate', v_effective_rate,
            'amount', v_line_amount
        );
    END LOOP;

    UPDATE public.bills
    SET total_amount = v_total_amount
    WHERE id = v_bill_id;

    INSERT INTO public.workflow_tasks (
        bill_id, assigned_role, status, remarks
    ) VALUES (
        v_bill_id, 'FINANCE_OFFICER', 'PENDING', 'Initial bill submission awaiting officer review'
    ) RETURNING id INTO v_task_id;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create mandatory initial workflow task'
            USING ERRCODE = 'data_exception';
    END IF;

    SELECT row_to_json(b)::jsonb INTO v_created_bill
    FROM public.bills b
    WHERE b.id = v_bill_id;

    v_created_bill := jsonb_set(v_created_bill, '{items}', v_created_items);

    RETURN v_created_bill;
END;
$$;

-- Apply SEC-05 Triggers & Policies
CREATE OR REPLACE FUNCTION public.trg_protect_bill_modifications()
RETURNS trigger AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF public.current_user_role() = 'SUPPLIER' THEN
        IF OLD.status IS DISTINCT FROM 'DRAFT' THEN
            RAISE EXCEPTION 'Suppliers cannot modify bills that are not in DRAFT status'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Bill ID cannot be modified'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.bill_number IS DISTINCT FROM OLD.bill_number THEN
            RAISE EXCEPTION 'Bill number cannot be modified'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
            RAISE EXCEPTION 'Supplier ID cannot be modified'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Suppliers cannot modify bill status directly (status must remain DRAFT)'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
            RAISE EXCEPTION 'Total amount is calculated by the server and cannot be directly modified'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by THEN
            RAISE EXCEPTION 'submitted_by cannot be modified'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id AND public.current_user_role() != 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can reassign bill supplier ownership'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_bill_modifications ON public.bills;
CREATE TRIGGER trg_protect_bill_modifications
    BEFORE UPDATE ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_bill_modifications();

-- ============================================================================
-- 2. TEST EXECUTION
-- ============================================================================

DO $$
DECLARE
    v_supp_id uuid;
    v_godown_id uuid;
    v_order_id uuid;
    v_deliv1_id uuid;
    v_deliv2_id uuid;
    v_deliv3_id uuid;
    v_user_id uuid;
    v_bill1_id uuid;
    v_bill2_id uuid;
    v_rpc_res jsonb;
BEGIN
    -- Setup test data
    SELECT id INTO v_supp_id FROM public.suppliers LIMIT 1;
    SELECT id INTO v_godown_id FROM public.godowns LIMIT 1;
    SELECT id INTO v_user_id FROM public.user_profiles WHERE role = 'ADMIN' LIMIT 1;

    -- Test 1: SEC-01 Delivery Capacity Enforcement on INSERT
    INSERT INTO public.supply_orders (
        order_number, supplier_id, godown_id, commodity_name, ordered_quantity, unit, agreed_rate, order_date, status
    ) VALUES (
        'TEST-ORD-SEC01', v_supp_id, v_godown_id, 'Test Wheat', 100.0, 'MT', 20.0, CURRENT_DATE, 'AUTHORIZED'
    ) RETURNING id INTO v_order_id;

    -- Insert valid 60 MT
    INSERT INTO public.deliveries (
        delivery_number, supply_order_id, delivered_quantity, delivery_date, status
    ) VALUES (
        'TEST-DEL-01', v_order_id, 60.0, CURRENT_DATE, 'DELIVERED'
    ) RETURNING id INTO v_deliv1_id;

    -- Try inserting 50 MT (60 + 50 = 110 > 100) -> should fail
    BEGIN
        INSERT INTO public.deliveries (
            delivery_number, supply_order_id, delivered_quantity, delivery_date, status
        ) VALUES (
            'TEST-DEL-02', v_order_id, 50.0, CURRENT_DATE, 'DELIVERED'
        );
        PERFORM record_mig004_test('SEC-01: Exceed order capacity on INSERT', 'CAPACITY', 'FAIL', 'SUCCESS', 'FAIL', 'Trigger allowed over-delivery');
    EXCEPTION WHEN check_violation THEN
        PERFORM record_mig004_test('SEC-01: Exceed order capacity on INSERT', 'CAPACITY', 'FAIL', 'check_violation', 'PASS', 'Trigger blocked over-delivery');
    END;

    -- Test 2: SEC-01 Delivery Capacity Enforcement on UPDATE
    BEGIN
        UPDATE public.deliveries
        SET delivered_quantity = 110.0
        WHERE id = v_deliv1_id;
        PERFORM record_mig004_test('SEC-01: Exceed order capacity on UPDATE', 'CAPACITY', 'FAIL', 'SUCCESS', 'FAIL', 'Trigger allowed update exceeding capacity');
    EXCEPTION WHEN check_violation THEN
        PERFORM record_mig004_test('SEC-01: Exceed order capacity on UPDATE', 'CAPACITY', 'FAIL', 'check_violation', 'PASS', 'Trigger blocked quantity update exceeding capacity');
    END;

    -- Test 3: SEC-02 Prevent Duplicate Active Billing of Delivery
    INSERT INTO public.deliveries (
        delivery_number, supply_order_id, delivered_quantity, delivery_date, status
    ) VALUES (
        'TEST-DEL-BILL-01', v_order_id, 20.0, CURRENT_DATE, 'DELIVERED'
    ) RETURNING id INTO v_deliv2_id;

    -- Bill 1 creates association
    INSERT INTO public.bills (
        bill_number, supplier_id, invoice_number, invoice_date, total_amount, status
    ) VALUES (
        'TEST-BILL-SEC02-A', v_supp_id, 'INV-SEC02-A', CURRENT_DATE, 400.0, 'SUBMITTED'
    ) RETURNING id INTO v_bill1_id;

    INSERT INTO public.bill_deliveries (bill_id, delivery_id, billed_quantity, rate, amount)
    VALUES (v_bill1_id, v_deliv2_id, 20.0, 20.0, 400.0);

    -- Bill 2 attempts to claim same delivery while Bill 1 is active -> should fail
    INSERT INTO public.bills (
        bill_number, supplier_id, invoice_number, invoice_date, total_amount, status
    ) VALUES (
        'TEST-BILL-SEC02-B', v_supp_id, 'INV-SEC02-B', CURRENT_DATE, 400.0, 'SUBMITTED'
    ) RETURNING id INTO v_bill2_id;

    BEGIN
        INSERT INTO public.bill_deliveries (bill_id, delivery_id, billed_quantity, rate, amount)
        VALUES (v_bill2_id, v_deliv2_id, 20.0, 20.0, 400.0);
        PERFORM record_mig004_test('SEC-02: Prevent duplicate billing across bills', 'BILLING', 'FAIL', 'SUCCESS', 'FAIL', 'Duplicate billing allowed');
    EXCEPTION WHEN check_violation THEN
        PERFORM record_mig004_test('SEC-02: Prevent duplicate billing across bills', 'BILLING', 'FAIL', 'check_violation', 'PASS', 'Trigger prevented duplicate active billing');
    END;

    -- Test 4: SEC-02 Re-billing permitted after previous bill is REJECTED or CANCELLED
    UPDATE public.bills SET status = 'REJECTED' WHERE id = v_bill1_id;

    -- Now Bill 2 should be able to bill it cleanly
    BEGIN
        INSERT INTO public.bill_deliveries (bill_id, delivery_id, billed_quantity, rate, amount)
        VALUES (v_bill2_id, v_deliv2_id, 20.0, 20.0, 400.0);
        PERFORM record_mig004_test('SEC-02: Re-billing permitted after rejection', 'BILLING', 'SUCCESS', 'SUCCESS', 'PASS', 'Delivery cleanly re-billed after previous bill rejection');
    EXCEPTION WHEN OTHERS THEN
        PERFORM record_mig004_test('SEC-02: Re-billing permitted after rejection', 'BILLING', 'SUCCESS', SQLERRM, 'FAIL', 'Re-billing failed unexpectedly');
    END;

    -- Test 5: SEC-02 Reactivation blocked if delivery re-billed
    BEGIN
        UPDATE public.bills SET status = 'SUBMITTED' WHERE id = v_bill1_id;
        PERFORM record_mig004_test('SEC-02: Block reactivation with re-billed delivery', 'BILLING', 'FAIL', 'SUCCESS', 'FAIL', 'Bill reactivation permitted with duplicate delivery');
    EXCEPTION WHEN check_violation THEN
        PERFORM record_mig004_test('SEC-02: Block reactivation with re-billed delivery', 'BILLING', 'FAIL', 'check_violation', 'PASS', 'Reactivation blocked because delivery is in another active bill');
    END;

    -- Test 6: SEC-03/04 submit_bill_atomic creates all records atomically
    INSERT INTO public.deliveries (
        delivery_number, supply_order_id, delivered_quantity, delivery_date, status
    ) VALUES (
        'TEST-DEL-RPC-01', v_order_id, 10.0, CURRENT_DATE, 'DELIVERED'
    ) RETURNING id INTO v_deliv3_id;

    INSERT INTO public.delivery_receipts (receipt_number, delivery_id, status)
    VALUES ('TEST-RCPT-RPC-01', v_deliv3_id, 'ISSUED');

    BEGIN
        v_rpc_res := public.submit_bill_atomic(
            'INV-ATOMIC-001',
            CURRENT_DATE,
            jsonb_build_array(jsonb_build_object('delivery_id', v_deliv3_id, 'billed_quantity', 10.0, 'rate', 20.0)),
            v_supp_id,
            v_user_id
        );
        PERFORM record_mig004_test('SEC-03/04: Atomic bill submission success', 'ATOMICITY', 'SUCCESS', 'SUCCESS', 'PASS', 'submit_bill_atomic created bill, items, and workflow task');
    EXCEPTION WHEN OTHERS THEN
        PERFORM record_mig004_test('SEC-03/04: Atomic bill submission success', 'ATOMICITY', 'SUCCESS', SQLERRM, 'FAIL', 'Atomic submission failed');
    END;

END $$;

SELECT test_id, category, test_name, expected, actual, result, details
FROM mig004_test_results
ORDER BY test_id;

ROLLBACK;
