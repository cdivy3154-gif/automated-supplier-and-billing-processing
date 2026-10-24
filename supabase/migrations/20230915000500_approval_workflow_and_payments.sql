-- 20230915000500_approval_workflow_and_payments.sql
-- Migration: Phase 2C - Approval Workflow and Simulated Payment Processing
-- Automated State Commodity Supplier Billing and Payment Processing
--
-- Implements:
--   1. Update submit_bill_atomic initial task to BRANCH_OFFICER
--   2. process_approval_atomic: Multi-stage server-enforced approval & rejection transitions
--   3. initiate_payment_atomic: Idempotent simulated payment initiation for finance-approved bills
--   4. simulate_payment_status_atomic: Simulated success or failure processing with audit logs
--
-- ROLLBACK STRATEGY:
--   DROP FUNCTION IF EXISTS public.simulate_payment_status_atomic(uuid, text, uuid);
--   DROP FUNCTION IF EXISTS public.initiate_payment_atomic(uuid, text, uuid);
--   DROP FUNCTION IF EXISTS public.process_approval_atomic(uuid, text, text, uuid);
--   Revert submit_bill_atomic to migration 004 definition.

-- ============================================================================
-- 1. UPDATE submit_bill_atomic TO INITIALIZE TASK FOR BRANCH_OFFICER
-- ============================================================================

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
        IF p_submitted_by IS NOT NULL AND p_submitted_by != auth.uid() THEN
            IF auth.role() != 'service_role' AND SESSION_USER NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
                RAISE EXCEPTION 'Caller is not permitted to specify submitted_by'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
            v_user_id := p_submitted_by;
        ELSE
            v_user_id := auth.uid();
        END IF;
    ELSIF p_submitted_by IS NOT NULL THEN
        IF auth.role() = 'service_role' OR SESSION_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
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

    -- 6. Insert Bill Header
    INSERT INTO public.bills (
        bill_number, supplier_id, invoice_number, invoice_date, total_amount, status, submitted_by
    ) VALUES (
        v_bill_number, v_effective_supplier_id, TRIM(p_invoice_number), p_invoice_date, 0.00, 'SUBMITTED', v_user_id
    ) RETURNING id INTO v_bill_id;

    -- 7. Validate and insert each delivery line item in deterministic order (sorted by delivery_id)
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

    -- 8. Update Bill Header with final verified total
    UPDATE public.bills
    SET total_amount = v_total_amount
    WHERE id = v_bill_id;

    -- 9. Insert initial workflow task for BRANCH_OFFICER review
    INSERT INTO public.workflow_tasks (
        bill_id, assigned_role, status, remarks
    ) VALUES (
        v_bill_id, 'BRANCH_OFFICER', 'PENDING', 'Initial bill submission awaiting branch officer review'
    ) RETURNING id INTO v_task_id;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create mandatory initial workflow task'
            USING ERRCODE = 'data_exception';
    END IF;

    -- 10. Record audit entry
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (
        v_user_id,
        'SUBMIT_BILL',
        'bills',
        v_bill_id,
        jsonb_build_object(
            'bill_number', v_bill_number,
            'supplier_id', v_effective_supplier_id,
            'invoice_number', TRIM(p_invoice_number),
            'total_amount', v_total_amount
        )
    );

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
-- 2. process_approval_atomic: MULTI-STAGE WORKFLOW ENGINE
-- ============================================================================
-- Atomic transaction handling review, pre-audit, GM approval, and finance verification.
-- Server-enforces transition rules and writes immutable approval history and audit log.

CREATE OR REPLACE FUNCTION public.process_approval_atomic(
    p_task_id uuid,
    p_decision text,
    p_comments text DEFAULT NULL,
    p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid;
    v_caller_role text;
    v_task record;
    v_bill record;
    v_approval_id uuid;
    v_new_bill_status text;
    v_next_role text := NULL;
    v_next_task_id uuid := NULL;
    v_next_remarks text := NULL;
    v_clean_decision text;
    v_result jsonb;
BEGIN
    -- 1. Identify and authenticate caller safely
    IF auth.uid() IS NOT NULL THEN
        IF p_actor_id IS NOT NULL AND p_actor_id != auth.uid() THEN
            IF auth.role() != 'service_role' AND SESSION_USER NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
                RAISE EXCEPTION 'Caller is not permitted to specify actor_id'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
            v_actor_id := p_actor_id;
        ELSE
            v_actor_id := auth.uid();
        END IF;
    ELSIF p_actor_id IS NOT NULL THEN
        IF auth.role() = 'service_role' OR SESSION_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
            v_actor_id := p_actor_id;
        ELSE
            RAISE EXCEPTION 'Caller is not permitted to specify actor_id'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        RAISE EXCEPTION 'Authentication required for workflow decision'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for actor ID %', v_actor_id
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 2. Validate decision value
    v_clean_decision := UPPER(TRIM(p_decision));
    IF v_clean_decision NOT IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid decision: must be APPROVED or REJECTED'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_clean_decision = 'REJECTED' AND (p_comments IS NULL OR TRIM(p_comments) = '') THEN
        RAISE EXCEPTION 'A rejection reason (comments) is mandatory when rejecting a bill'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 3. Lock workflow task FOR UPDATE to serialize concurrent decisions
    SELECT id, bill_id, assigned_role, assigned_user_id, status
    INTO v_task
    FROM public.workflow_tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workflow task ID % not found', p_task_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_task.status != 'PENDING' THEN
        RAISE EXCEPTION 'Workflow task is already % (must be PENDING)', v_task.status
            USING ERRCODE = 'check_violation';
    END IF;

    -- 4. Lock parent bill FOR UPDATE
    SELECT id, bill_number, supplier_id, status, total_amount
    INTO v_bill
    FROM public.bills
    WHERE id = v_task.bill_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent bill ID % not found', v_task.bill_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_bill.status IN ('REJECTED', 'CANCELLED', 'PAID') THEN
        RAISE EXCEPTION 'Cannot perform workflow action on bill in terminal status %', v_bill.status
            USING ERRCODE = 'check_violation';
    END IF;

    -- Prerequisite stage validation to prevent stage-skipping directly in SQL
    IF v_task.assigned_role = 'BRANCH_OFFICER' AND v_bill.status != 'SUBMITTED' THEN
        RAISE EXCEPTION 'Branch review requires bill status SUBMITTED (current status: %)', v_bill.status
            USING ERRCODE = 'check_violation';
    ELSIF v_task.assigned_role = 'PRE_AUDITOR' AND v_bill.status != 'BRANCH_APPROVED' THEN
        RAISE EXCEPTION 'Pre-audit review requires bill status BRANCH_APPROVED (current status: %)', v_bill.status
            USING ERRCODE = 'check_violation';
    ELSIF v_task.assigned_role = 'GENERAL_MANAGER' AND v_bill.status != 'PRE_AUDITED' THEN
        RAISE EXCEPTION 'General manager approval requires bill status PRE_AUDITED (current status: %)', v_bill.status
            USING ERRCODE = 'check_violation';
    ELSIF v_task.assigned_role = 'FINANCE_OFFICER' AND v_bill.status != 'GM_APPROVED' THEN
        RAISE EXCEPTION 'Finance clearance requires bill status GM_APPROVED (current status: %)', v_bill.status
            USING ERRCODE = 'check_violation';
    END IF;

    -- 5. Validate caller role against task assignment
    IF v_caller_role != 'ADMIN' AND v_caller_role != v_task.assigned_role THEN
        RAISE EXCEPTION 'Role % is not authorized to act on task assigned to %', v_caller_role, v_task.assigned_role
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- If task was assigned to a specific user, enforce assignment (unless ADMIN)
    IF v_task.assigned_user_id IS NOT NULL AND v_caller_role != 'ADMIN' AND v_task.assigned_user_id != v_actor_id THEN
        RAISE EXCEPTION 'This task is assigned specifically to user %', v_task.assigned_user_id
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 6. Insert permanent approval decision record
    INSERT INTO public.approvals (
        bill_id, workflow_task_id, approver_id, approver_role, decision, comments
    ) VALUES (
        v_bill.id, v_task.id, v_actor_id, v_caller_role, v_clean_decision, TRIM(p_comments)
    ) RETURNING id INTO v_approval_id;

    -- 7. Execute State Transition
    IF v_clean_decision = 'REJECTED' THEN
        -- Task is marked REJECTED
        UPDATE public.workflow_tasks
        SET status = 'REJECTED',
            remarks = TRIM(p_comments),
            completed_at = now(),
            updated_at = now()
        WHERE id = v_task.id;

        -- Bill is marked REJECTED (no further tasks created)
        v_new_bill_status := 'REJECTED';
        UPDATE public.bills
        SET status = v_new_bill_status,
            updated_at = now()
        WHERE id = v_bill.id;

        -- Record audit log
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_actor_id,
            'REJECT_BILL',
            'bills',
            v_bill.id,
            jsonb_build_object(
                'task_id', v_task.id,
                'role', v_caller_role,
                'rejection_reason', TRIM(p_comments),
                'bill_number', v_bill.bill_number
            )
        );

    ELSE -- APPROVED
        -- Complete current task
        UPDATE public.workflow_tasks
        SET status = 'COMPLETED',
            remarks = TRIM(p_comments),
            completed_at = now(),
            updated_at = now()
        WHERE id = v_task.id;

        -- Determine sequential next stage
        IF v_task.assigned_role = 'BRANCH_OFFICER' THEN
            v_new_bill_status := 'BRANCH_APPROVED';
            v_next_role := 'PRE_AUDITOR';
            v_next_remarks := 'Awaiting pre-audit verification';
        ELSIF v_task.assigned_role = 'PRE_AUDITOR' THEN
            v_new_bill_status := 'PRE_AUDITED';
            v_next_role := 'GENERAL_MANAGER';
            v_next_remarks := 'Awaiting general manager approval';
        ELSIF v_task.assigned_role = 'GENERAL_MANAGER' THEN
            v_new_bill_status := 'GM_APPROVED';
            v_next_role := 'FINANCE_OFFICER';
            v_next_remarks := 'Awaiting final finance verification and payment authorization';
        ELSIF v_task.assigned_role = 'FINANCE_OFFICER' THEN
            v_new_bill_status := 'APPROVED';
            v_next_role := NULL; -- Final approval reached
        ELSE
            RAISE EXCEPTION 'Unexpected workflow task assigned role %', v_task.assigned_role
                USING ERRCODE = 'data_exception';
        END IF;

        -- Update bill status
        UPDATE public.bills
        SET status = v_new_bill_status,
            updated_at = now()
        WHERE id = v_bill.id;

        -- Create next workflow task if not final
        IF v_next_role IS NOT NULL THEN
            INSERT INTO public.workflow_tasks (
                bill_id, assigned_role, status, remarks
            ) VALUES (
                v_bill.id, v_next_role, 'PENDING', v_next_remarks
            ) RETURNING id INTO v_next_task_id;
        END IF;

        -- Record audit log
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_actor_id,
            'APPROVE_BILL_STAGE',
            'bills',
            v_bill.id,
            jsonb_build_object(
                'task_id', v_task.id,
                'role', v_caller_role,
                'stage_completed', v_task.assigned_role,
                'new_bill_status', v_new_bill_status,
                'next_role', v_next_role
            )
        );
    END IF;

    v_result := jsonb_build_object(
        'approval_id', v_approval_id,
        'bill_id', v_bill.id,
        'bill_status', v_new_bill_status,
        'decision', v_clean_decision,
        'task_id', v_task.id,
        'next_task_id', v_next_task_id,
        'next_role', v_next_role
    );

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_approval_atomic(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_approval_atomic(uuid, text, text, uuid) TO authenticated;

-- ============================================================================
-- 3. initiate_payment_atomic: IDEMPOTENT PAYMENT INITIATION
-- ============================================================================
-- Authoritative payment creation restricted to finance approved bills.
-- Enforces authoritative bill total and unique active payment constraint.

CREATE OR REPLACE FUNCTION public.initiate_payment_atomic(
    p_bill_id uuid,
    p_payment_reference text DEFAULT NULL,
    p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid;
    v_caller_role text;
    v_bill record;
    v_existing_payment record;
    v_ref text;
    v_payment_rec record;
BEGIN
    -- 1. Identify and authenticate caller safely
    IF auth.uid() IS NOT NULL THEN
        IF p_actor_id IS NOT NULL AND p_actor_id != auth.uid() THEN
            IF auth.role() != 'service_role' AND SESSION_USER NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
                RAISE EXCEPTION 'Caller is not permitted to specify actor_id'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
            v_actor_id := p_actor_id;
        ELSE
            v_actor_id := auth.uid();
        END IF;
    ELSIF p_actor_id IS NOT NULL THEN
        IF auth.role() = 'service_role' OR SESSION_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
            v_actor_id := p_actor_id;
        ELSE
            RAISE EXCEPTION 'Caller is not permitted to specify actor_id'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        RAISE EXCEPTION 'Authentication required to initiate payment'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for actor ID %', v_actor_id
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_caller_role NOT IN ('FINANCE_OFFICER', 'ADMIN') THEN
        RAISE EXCEPTION 'Role % is not authorized to initiate payments', v_caller_role
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Lock parent bill FOR UPDATE
    SELECT id, bill_number, supplier_id, status, total_amount
    INTO v_bill
    FROM public.bills
    WHERE id = p_bill_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill ID % not found', p_bill_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- 3. Idempotency Check: if an active payment already exists, return it cleanly
    SELECT id, bill_id, payment_reference, amount, status, initiated_by, initiated_at, confirmed_at, created_at, updated_at
    INTO v_existing_payment
    FROM public.payments
    WHERE bill_id = p_bill_id
      AND status NOT IN ('FAILED', 'REVERSED', 'CANCELLED', 'REJECTED')
    LIMIT 1;

    IF FOUND THEN
        RETURN row_to_json(v_existing_payment)::jsonb;
    END IF;

    -- 4. Only bills in APPROVED (finance cleared) or PAYMENT_FAILED (eligible retry) can initiate new payment
    IF v_bill.status NOT IN ('APPROVED', 'PAYMENT_FAILED') THEN
        RAISE EXCEPTION 'Cannot initiate payment: bill must be in APPROVED or PAYMENT_FAILED status (current status: %)', v_bill.status
            USING ERRCODE = 'check_violation';
    END IF;

    -- 4. Generate trusted server payment reference
    v_ref := COALESCE(
        TRIM(p_payment_reference),
        'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 6))
    );

    -- 5. Insert payment record (amount strictly derived from bill authoritative total)
    INSERT INTO public.payments (
        bill_id, payment_reference, amount, status, initiated_by, initiated_at
    ) VALUES (
        v_bill.id, v_ref, v_bill.total_amount, 'INITIATED', v_actor_id, now()
    ) RETURNING * INTO v_payment_rec;

    -- 6. Update bill status
    UPDATE public.bills
    SET status = 'PAYMENT_PENDING',
        updated_at = now()
    WHERE id = v_bill.id;

    -- 7. Record audit log
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (
        v_actor_id,
        'INITIATE_PAYMENT',
        'payments',
        v_payment_rec.id,
        jsonb_build_object(
            'bill_id', v_bill.id,
            'payment_reference', v_ref,
            'amount', v_bill.total_amount,
            'status', 'INITIATED'
        )
    );

    RETURN row_to_json(v_payment_rec)::jsonb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.initiate_payment_atomic(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initiate_payment_atomic(uuid, text, uuid) TO authenticated;

-- ============================================================================
-- 4. simulate_payment_status_atomic: SIMULATED PAYMENT CONFIRMATION / FAILURE
-- ============================================================================
-- Simulates the asynchronous banking gateway response (SUCCESS or FAILED).
-- Updates bill to PAID on success or PAYMENT_FAILED on failure.

CREATE OR REPLACE FUNCTION public.simulate_payment_status_atomic(
    p_payment_id uuid,
    p_target_status text,
    p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid;
    v_caller_role text;
    v_payment record;
    v_bill record;
    v_clean_status text;
    v_updated_payment record;
BEGIN
    -- 1. Identify and authenticate caller safely
    IF auth.uid() IS NOT NULL THEN
        IF p_actor_id IS NOT NULL AND p_actor_id != auth.uid() THEN
            IF auth.role() != 'service_role' AND SESSION_USER NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
                RAISE EXCEPTION 'Caller is not permitted to specify actor_id'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
            v_actor_id := p_actor_id;
        ELSE
            v_actor_id := auth.uid();
        END IF;
    ELSIF p_actor_id IS NOT NULL THEN
        IF auth.role() = 'service_role' OR SESSION_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
            v_actor_id := p_actor_id;
        ELSE
            RAISE EXCEPTION 'Caller is not permitted to specify actor_id'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        RAISE EXCEPTION 'Authentication required for payment simulation'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for actor ID %', v_actor_id
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_caller_role NOT IN ('FINANCE_OFFICER', 'ADMIN') THEN
        RAISE EXCEPTION 'Role % is not authorized to simulate payment processing', v_caller_role
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_clean_status := UPPER(TRIM(p_target_status));
    IF v_clean_status NOT IN ('SUCCESS', 'FAILED') THEN
        RAISE EXCEPTION 'Invalid target status: must be SUCCESS or FAILED'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 2. Lock payment row FOR UPDATE
    SELECT id, bill_id, payment_reference, amount, status
    INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment ID % not found', p_payment_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_payment.status NOT IN ('INITIATED', 'PROCESSING') THEN
        RAISE EXCEPTION 'Payment % is already in terminal status %', v_payment.payment_reference, v_payment.status
            USING ERRCODE = 'check_violation';
    END IF;

    -- 3. Lock parent bill FOR UPDATE
    SELECT id, status
    INTO v_bill
    FROM public.bills
    WHERE id = v_payment.bill_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent bill ID % not found for payment', v_payment.bill_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_bill.status = 'PAID' THEN
        RAISE EXCEPTION 'Cannot modify payment for bill already in PAID status'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 4. Process Target Status
    IF v_clean_status = 'SUCCESS' THEN
        UPDATE public.payments
        SET status = 'SUCCESS',
            confirmed_at = now(),
            updated_at = now()
        WHERE id = v_payment.id
        RETURNING * INTO v_updated_payment;

        UPDATE public.bills
        SET status = 'PAID',
            updated_at = now()
        WHERE id = v_bill.id;

        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_actor_id,
            'CONFIRM_PAYMENT_SUCCESS',
            'payments',
            v_payment.id,
            jsonb_build_object(
                'bill_id', v_bill.id,
                'payment_reference', v_payment.payment_reference,
                'status', 'SUCCESS'
            )
        );

    ELSE -- FAILED
        UPDATE public.payments
        SET status = 'FAILED',
            updated_at = now()
        WHERE id = v_payment.id
        RETURNING * INTO v_updated_payment;

        UPDATE public.bills
        SET status = 'PAYMENT_FAILED',
            updated_at = now()
        WHERE id = v_bill.id;

        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_actor_id,
            'RECORD_PAYMENT_FAILURE',
            'payments',
            v_payment.id,
            jsonb_build_object(
                'bill_id', v_bill.id,
                'payment_reference', v_payment.payment_reference,
                'status', 'FAILED'
            )
        );
    END IF;

    RETURN row_to_json(v_updated_payment)::jsonb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.simulate_payment_status_atomic(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.simulate_payment_status_atomic(uuid, text, uuid) TO authenticated;
