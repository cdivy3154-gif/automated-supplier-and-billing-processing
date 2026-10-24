-- 20230915000400_transaction_safety_and_integrity.sql
-- Migration: Phase 2B Remediation - Transaction Safety and Database Security
-- Automated State Commodity Supplier Billing and Payment Processing
--
-- Resolves:
--   SEC-01: Database-level cumulative delivery capacity enforcement (prevents over-delivery)
--   SEC-02: Prevent duplicate billing of a delivery across active bills
--   SEC-03 & SEC-04: Atomic bill submission RPC (single-transaction bill header, lines, workflow task)
--   SEC-05: Direct REST update protection on draft bills (protects status, amounts, ownership)
--
-- ROLLBACK STRATEGY:
--   DROP TRIGGER IF EXISTS trg_validate_cumulative_delivery ON public.deliveries;
--   DROP FUNCTION IF EXISTS public.trg_validate_cumulative_delivery_capacity();
--   DROP TRIGGER IF EXISTS trg_prevent_duplicate_delivery_billing ON public.bill_deliveries;
--   DROP FUNCTION IF EXISTS public.trg_prevent_duplicate_delivery_billing();
--   DROP TRIGGER IF EXISTS trg_check_bill_reactivation ON public.bills;
--   DROP FUNCTION IF EXISTS public.trg_check_bill_reactivation_deliveries();
--   DROP FUNCTION IF EXISTS public.submit_bill_atomic(text, date, jsonb, uuid, uuid);
--   DROP TRIGGER IF EXISTS trg_protect_bill_modifications ON public.bills;
--   DROP FUNCTION IF EXISTS public.trg_protect_bill_modifications();
--   Revert bills_update policy to migration 002 definition.

-- ============================================================================
-- 0. PREFLIGHT DATA INTEGRITY AUDIT QUERIES
-- ============================================================================
-- The following checks verify that no existing data violates the new integrity rules.

DO $$
DECLARE
    v_overdelivered_count integer;
    v_duplicate_billing_count integer;
BEGIN
    -- Preflight 1: Check for over-delivered supply orders
    SELECT COUNT(*) INTO v_overdelivered_count
    FROM (
        SELECT so.id
        FROM public.supply_orders so
        JOIN public.deliveries d ON d.supply_order_id = so.id
        WHERE d.status NOT IN ('REJECTED', 'CANCELLED')
        GROUP BY so.id, so.ordered_quantity
        HAVING SUM(d.delivered_quantity) > so.ordered_quantity
    ) t;

    IF v_overdelivered_count > 0 THEN
        RAISE EXCEPTION 'Preflight check failed: % supply orders have cumulative deliveries exceeding ordered quantity', v_overdelivered_count;
    END IF;

    -- Preflight 2: Check for deliveries billed under multiple active bills
    SELECT COUNT(*) INTO v_duplicate_billing_count
    FROM (
        SELECT bd.delivery_id
        FROM public.bill_deliveries bd
        JOIN public.bills b ON b.id = bd.bill_id
        WHERE b.status NOT IN ('REJECTED', 'CANCELLED')
        GROUP BY bd.delivery_id
        HAVING COUNT(DISTINCT b.id) > 1
    ) t;

    IF v_duplicate_billing_count > 0 THEN
        RAISE EXCEPTION 'Preflight check failed: % deliveries are associated with multiple active bills', v_duplicate_billing_count;
    END IF;
END $$;

-- ============================================================================
-- 1. SEC-01: CUMULATIVE DELIVERY CAPACITY ENFORCEMENT
-- ============================================================================
-- Serializes capacity checks for deliveries on the same supply order by
-- acquiring an exclusive row lock on public.supply_orders FOR UPDATE.
-- Enforces that cumulative eligible delivered quantity does not exceed ordered_quantity.

CREATE OR REPLACE FUNCTION public.trg_validate_cumulative_delivery_capacity()
RETURNS trigger AS $$
DECLARE
    v_ordered_qty numeric;
    v_order_status text;
    v_current_delivered numeric;
BEGIN
    -- Allow management scripts when auth.uid() is null and bypass is explicitly set
    -- Otherwise, enforce strict checks for all operations
    IF TG_OP = 'UPDATE' AND OLD.supply_order_id IS DISTINCT FROM NEW.supply_order_id THEN
        RAISE EXCEPTION 'Cannot change supply_order_id on an existing delivery record'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- If delivery is marked REJECTED or CANCELLED, it does not consume capacity
    IF NEW.status IN ('REJECTED', 'CANCELLED') THEN
        RETURN NEW;
    END IF;

    -- Acquire exclusive row-level lock on the parent supply order to serialize concurrent requests
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

    -- Sum existing eligible deliveries excluding the current row (if updating)
    SELECT COALESCE(SUM(delivered_quantity), 0)
    INTO v_current_delivered
    FROM public.deliveries
    WHERE supply_order_id = NEW.supply_order_id
      AND status NOT IN ('REJECTED', 'CANCELLED')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- Enforce cumulative limit
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

-- ============================================================================
-- 2. SEC-02: PREVENT DUPLICATE BILLING OF A DELIVERY
-- ============================================================================
-- Enforces that a delivery cannot be associated with more than one active or
-- financially claimable bill (status NOT IN ('REJECTED', 'CANCELLED')).
-- Uses row-level locking on public.deliveries to serialize concurrent bill submissions.

CREATE OR REPLACE FUNCTION public.trg_prevent_duplicate_delivery_billing()
RETURNS trigger AS $$
BEGIN
    -- Acquire exclusive row lock on referenced delivery to serialize concurrent submissions
    PERFORM 1 FROM public.deliveries WHERE id = NEW.delivery_id FOR UPDATE;

    -- Verify that the delivery is not already present in any non-rejected, non-cancelled bill
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

-- Prevent reactivation of a cancelled or rejected bill if its deliveries were re-billed
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

-- ============================================================================
-- 3. SEC-03 & SEC-04: ATOMIC BILL SUBMISSION RPC
-- ============================================================================
-- A single transactional database function creating bill header, bill_deliveries,
-- and the initial workflow task. Rolls back completely if any step fails.

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
        -- Allow explicit user override only during internal testing/seeding when running as administrative database role
        IF CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
            v_user_id := p_submitted_by;
        ELSE
            RAISE EXCEPTION 'Caller is not permitted to specify submitted_by'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
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

    -- 2. Determine effective supplier ID
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

    -- 3. Check duplicate invoice number for supplier
    IF EXISTS (
        SELECT 1 FROM public.bills
        WHERE supplier_id = v_effective_supplier_id
          AND invoice_number = TRIM(p_invoice_number)
    ) THEN
        RAISE EXCEPTION 'Invoice % has already been submitted for this supplier', TRIM(p_invoice_number)
            USING ERRCODE = 'unique_violation';
    END IF;

    -- 4. Validate items array
    IF p_delivery_items IS NULL OR jsonb_array_length(p_delivery_items) = 0 THEN
        RAISE EXCEPTION 'Delivery items payload cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 5. Generate bill number
    v_bill_number := 'BILL-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 6));

    -- 6. Insert Bill Header (initially with 0.00 total, updated after line item verification)
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

        -- Check duplicate delivery in payload
        IF v_deliv_id = ANY(v_seen_deliveries) THEN
            RAISE EXCEPTION 'Duplicate delivery ID % in submission payload', v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;
        v_seen_deliveries := array_append(v_seen_deliveries, v_deliv_id);

        -- Lock delivery row and fetch parent supply order details
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

        -- Verify issued delivery receipt exists
        SELECT status INTO v_receipt_status
        FROM public.delivery_receipts
        WHERE delivery_id = v_deliv_id;

        IF NOT FOUND OR v_receipt_status != 'ISSUED' THEN
            RAISE EXCEPTION 'Delivery % does not have an issued delivery receipt', v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;

        -- Validate quantity
        IF v_billed_qty > v_deliv_qty THEN
            RAISE EXCEPTION 'Billed quantity % exceeds delivered quantity % for delivery %',
                v_billed_qty, v_deliv_qty, v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;

        -- Validate rate
        v_effective_rate := COALESCE(v_item_rate, v_agreed_rate);
        IF v_effective_rate > v_agreed_rate THEN
            RAISE EXCEPTION 'Billed rate % exceeds agreed order rate % for delivery %',
                v_effective_rate, v_agreed_rate, v_deliv_id
                USING ERRCODE = 'check_violation';
        END IF;

        -- Calculate line amount with 2 decimal places
        v_line_amount := ROUND(v_billed_qty * v_effective_rate, 2);
        v_total_amount := v_total_amount + v_line_amount;

        -- Insert bill_deliveries (SEC-02 trigger validates duplicate active billing)
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

    -- 8. Update Bill Header with final verified total
    UPDATE public.bills
    SET total_amount = v_total_amount
    WHERE id = v_bill_id;

    -- 9. Insert initial workflow task
    INSERT INTO public.workflow_tasks (
        bill_id, assigned_role, status, remarks
    ) VALUES (
        v_bill_id, 'FINANCE_OFFICER', 'PENDING', 'Initial bill submission awaiting officer review'
    ) RETURNING id INTO v_task_id;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create mandatory initial workflow task'
            USING ERRCODE = 'data_exception';
    END IF;

    -- 10. Fetch complete bill record for return
    SELECT row_to_json(b)::jsonb INTO v_created_bill
    FROM public.bills b
    WHERE b.id = v_bill_id;

    v_created_bill := jsonb_set(v_created_bill, '{items}', v_created_items);

    RETURN v_created_bill;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_bill_atomic(text, date, jsonb, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_bill_atomic(text, date, jsonb, uuid, uuid) TO authenticated;

-- ============================================================================
-- 4. SEC-05: DIRECT REST UPDATE PROTECTION ON DRAFT BILLS
-- ============================================================================
-- Protects bill status, total_amount, bill_number, and supplier ownership
-- against direct client tampering via PostgREST updates.

CREATE OR REPLACE FUNCTION public.trg_protect_bill_modifications()
RETURNS trigger AS $$
BEGIN
    -- Allow internal seed or migrations where auth.uid() is null
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Suppliers can only edit DRAFT bills and cannot change protected columns
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

    -- Non-admins cannot alter supplier ownership on any bill
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

-- Update bills_update RLS policy to enforce status = 'DRAFT' on both USING and WITH CHECK
DROP POLICY IF EXISTS bills_update ON public.bills;
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
            AND status = 'DRAFT'
        )
    );
