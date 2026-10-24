-- 20230915000300_seed_data.sql
-- Synthetic development data for Phase 1 prototype
-- Automated State Commodity Supplier Billing and Payment Processing

-- Ensure the user profile protection trigger allows initial seed data bootstrap
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

-- Clean existing seed data if re-running (idempotent)
DELETE FROM public.audit_logs WHERE action IN ('CREATE_BILL');
DELETE FROM public.payments WHERE payment_reference IN ('PAY-6001');
DELETE FROM public.approvals WHERE comments LIKE '%Delivery and invoice match verified%';
DELETE FROM public.workflow_tasks WHERE remarks LIKE '%Pending financial verification%';
DELETE FROM public.bill_deliveries WHERE bill_id IN (SELECT id FROM public.bills WHERE bill_number = 'BILL-4001');
DELETE FROM public.bills WHERE bill_number IN ('BILL-4001');
DELETE FROM public.delivery_receipts WHERE receipt_number IN ('RCPT-3001', 'RCPT-3002');
DELETE FROM public.deliveries WHERE delivery_number IN ('DEL-2001', 'DEL-2002');
DELETE FROM public.supply_orders WHERE order_number IN ('ORD-1001', 'ORD-1002');
DELETE FROM public.godowns WHERE godown_code IN ('GOD001', 'GOD002');
UPDATE public.user_profiles SET supplier_id = NULL WHERE email IN ('supplier1@example.com', 'supplier2@example.com');
DELETE FROM public.suppliers WHERE supplier_code IN ('SUP001', 'SUP002');
DELETE FROM public.user_profiles WHERE email IN (
    'admin@example.com', 'supplier1@example.com', 'supplier2@example.com',
    'godownmgr@example.com', 'branch@example.com', 'auditor@example.com',
    'gm@example.com', 'finance@example.com'
);

-- 1. Insert sample user profiles
INSERT INTO public.user_profiles (id, full_name, email, role, is_active)
VALUES
    (gen_random_uuid(), 'Admin User', 'admin@example.com', 'ADMIN', true),
    (gen_random_uuid(), 'Supplier One', 'supplier1@example.com', 'SUPPLIER', true),
    (gen_random_uuid(), 'Supplier Two', 'supplier2@example.com', 'SUPPLIER', true),
    (gen_random_uuid(), 'Godown Manager', 'godownmgr@example.com', 'GODOWN_MANAGER', true),
    (gen_random_uuid(), 'Branch Officer', 'branch@example.com', 'BRANCH_OFFICER', true),
    (gen_random_uuid(), 'Pre Auditor', 'auditor@example.com', 'PRE_AUDITOR', true),
    (gen_random_uuid(), 'General Manager', 'gm@example.com', 'GENERAL_MANAGER', true),
    (gen_random_uuid(), 'Finance Officer', 'finance@example.com', 'FINANCE_OFFICER', true);

-- 2. Insert suppliers
INSERT INTO public.suppliers (id, supplier_code, supplier_name, contact_email, contact_phone, address)
VALUES
    (gen_random_uuid(), 'SUP001', 'Acme Supplies Ltd.', 'contact@acme.com', '1234567890', '123 Main St, City'),
    (gen_random_uuid(), 'SUP002', 'Beta Industries', 'info@beta.com', '0987654321', '456 Side Rd, Town');

-- Link supplier user profiles to supplier entities for strict RLS tenant isolation
UPDATE public.user_profiles
SET supplier_id = (SELECT id FROM public.suppliers WHERE supplier_code = 'SUP001')
WHERE email = 'supplier1@example.com';

UPDATE public.user_profiles
SET supplier_id = (SELECT id FROM public.suppliers WHERE supplier_code = 'SUP002')
WHERE email = 'supplier2@example.com';

-- 3. Insert godowns
INSERT INTO public.godowns (id, godown_code, godown_name, location)
VALUES
    (gen_random_uuid(), 'GOD001', 'Central Warehouse', 'Central City'),
    (gen_random_uuid(), 'GOD002', 'East Depot', 'East Town');

-- 4. Insert supply orders
INSERT INTO public.supply_orders (id, order_number, supplier_id, godown_id, commodity_name, ordered_quantity, unit, agreed_rate, order_date, status)
SELECT
    gen_random_uuid(),
    'ORD-1001',
    s.id,
    g.id,
    'Wheat',
    1000,
    'kg',
    25.50,
    CURRENT_DATE,
    'AUTHORIZED'
FROM public.suppliers s, public.godowns g
WHERE s.supplier_code = 'SUP001' AND g.godown_code = 'GOD001'
UNION ALL
SELECT
    gen_random_uuid(),
    'ORD-1002',
    s.id,
    g.id,
    'Rice',
    500,
    'kg',
    30.00,
    CURRENT_DATE,
    'AUTHORIZED'
FROM public.suppliers s, public.godowns g
WHERE s.supplier_code = 'SUP002' AND g.godown_code = 'GOD002';

-- 5. Insert deliveries
INSERT INTO public.deliveries (id, delivery_number, supply_order_id, delivered_quantity, delivery_date, verified_by, status)
SELECT
    gen_random_uuid(),
    'DEL-2001',
    so.id,
    1000,
    CURRENT_DATE,
    (SELECT id FROM public.user_profiles WHERE email = 'godownmgr@example.com'),
    'DELIVERED'
FROM public.supply_orders so WHERE so.order_number = 'ORD-1001'
UNION ALL
SELECT
    gen_random_uuid(),
    'DEL-2002',
    so.id,
    500,
    CURRENT_DATE,
    (SELECT id FROM public.user_profiles WHERE email = 'godownmgr@example.com'),
    'DELIVERED'
FROM public.supply_orders so WHERE so.order_number = 'ORD-1002';

-- 6. Insert delivery receipts
INSERT INTO public.delivery_receipts (id, receipt_number, delivery_id, receipt_reference, issued_by, status)
SELECT
    gen_random_uuid(),
    'RCPT-3001',
    d.id,
    'REF-001',
    (SELECT id FROM public.user_profiles WHERE email = 'godownmgr@example.com'),
    'ISSUED'
FROM public.deliveries d WHERE d.delivery_number = 'DEL-2001'
UNION ALL
SELECT
    gen_random_uuid(),
    'RCPT-3002',
    d.id,
    'REF-002',
    (SELECT id FROM public.user_profiles WHERE email = 'godownmgr@example.com'),
    'ISSUED'
FROM public.deliveries d WHERE d.delivery_number = 'DEL-2002';

-- 7. Insert sample bill (SUP001)
INSERT INTO public.bills (id, bill_number, supplier_id, invoice_number, invoice_date, total_amount, status, submitted_by)
SELECT
    gen_random_uuid(),
    'BILL-4001',
    s.id,
    'INV-5001',
    CURRENT_DATE,
    25500.00,
    'SUBMITTED',
    (SELECT id FROM public.user_profiles WHERE email = 'supplier1@example.com')
FROM public.suppliers s WHERE s.supplier_code = 'SUP001';

-- 8. Link bill to deliveries via bill_deliveries
INSERT INTO public.bill_deliveries (id, bill_id, delivery_id, billed_quantity, rate, amount)
SELECT
    gen_random_uuid(),
    b.id,
    d.id,
    d.delivered_quantity,
    25.50,
    d.delivered_quantity * 25.50
FROM public.bills b, public.deliveries d
WHERE b.bill_number = 'BILL-4001' AND d.delivery_number = 'DEL-2001';

-- 9. Insert workflow task for the bill
INSERT INTO public.workflow_tasks (id, bill_id, assigned_role, assigned_user_id, status, remarks, created_at, updated_at)
SELECT
    gen_random_uuid(),
    b.id,
    'FINANCE_OFFICER',
    (SELECT id FROM public.user_profiles WHERE email = 'finance@example.com'),
    'PENDING',
    'Pending financial verification and audit clearance',
    now(),
    now()
FROM public.bills b WHERE b.bill_number = 'BILL-4001';

-- 10. Insert approval record (decision history)
INSERT INTO public.approvals (id, bill_id, workflow_task_id, approver_id, approver_role, decision, comments, decided_at)
SELECT
    gen_random_uuid(),
    b.id,
    wt.id,
    (SELECT id FROM public.user_profiles WHERE email = 'finance@example.com'),
    'FINANCE_OFFICER',
    'APPROVED',
    'Delivery and invoice match verified. Passed for payment disbursement.',
    now()
FROM public.bills b, public.workflow_tasks wt
WHERE b.bill_number = 'BILL-4001' AND wt.bill_id = b.id;

-- 11. Insert payment record (simulated status)
INSERT INTO public.payments (id, bill_id, payment_reference, amount, status, initiated_by, initiated_at)
SELECT
    gen_random_uuid(),
    b.id,
    'PAY-6001',
    b.total_amount,
    'INITIATED',
    (SELECT id FROM public.user_profiles WHERE email = 'finance@example.com'),
    now()
FROM public.bills b WHERE b.bill_number = 'BILL-4001';

-- 12. Insert audit log record
INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, details)
SELECT
    gen_random_uuid(),
    (SELECT id FROM public.user_profiles WHERE email = 'admin@example.com'),
    'CREATE_BILL',
    'bills',
    (SELECT id FROM public.bills WHERE bill_number = 'BILL-4001'),
    jsonb_build_object('bill_number', 'BILL-4001', 'total_amount', 25500.00, 'supplier', 'Acme Supplies Ltd.');
