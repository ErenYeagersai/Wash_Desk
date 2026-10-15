-- ============================================================
-- UNi LaunDRY — Development Seed Data
-- Run AFTER the migration. Requires Supabase Auth users to
-- already exist (created via Supabase Dashboard or CLI).
--
-- Auth UUIDs below are placeholders — replace with the actual
-- UUIDs from auth.users after creating the accounts.
-- ============================================================

-- ── Dev user UUIDs (replace before running) ─────────────────
-- Create these in Supabase Dashboard → Authentication → Users
-- with email confirmation disabled (for dev/MVP).
--
-- student1: venkatesh@uni.edu  / password: Dev@12345
-- student2: rahul@uni.edu      / password: Dev@12345
-- student3: priya@uni.edu      / password: Dev@12345
-- staff1:   staff1@uni.edu     / password: Dev@12345
-- staff2:   staff2@uni.edu     / password: Dev@12345
-- admin:    admin@uni.edu      / password: Dev@12345
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- Replace these UUIDs with the real ones from auth.users
  v_student1  UUID := '11111111-0000-0000-0000-000000000001';
  v_student2  UUID := '22222222-0000-0000-0000-000000000002';
  v_student3  UUID := '33333333-0000-0000-0000-000000000003';
  v_staff1    UUID := '44444444-0000-0000-0000-000000000004';
  v_staff2    UUID := '55555555-0000-0000-0000-000000000005';
  v_admin     UUID := '66666666-0000-0000-0000-000000000006';

  v_bag1      UUID;
  v_bag2      UUID;
  v_bag3      UUID;
  v_order1    UUID;
  v_order2    UUID;
  v_order3    UUID;
BEGIN

-- ── Profiles ─────────────────────────────────────────────────
-- Note: handle_new_user() creates profile rows on auth.users insert.
-- For seed, we upsert directly (dev only; production always goes via Auth).

INSERT INTO public.profiles (id, registration_id, name, hostel, room_number, phone, role)
VALUES
  (v_student1, '23CSE1045', 'Venkatesh Kumar',  'Block A', 'A-204', '9876543210', 'student'),
  (v_student2, '23CSE1046', 'Rahul Sharma',      'Block B', 'B-110', '9876543211', 'student'),
  (v_student3, '23CSE1047', 'Priya Menon',       'Block C', 'C-305', '9876543212', 'student'),
  (v_staff1,   'STAFF001',  'Ravi Patel',        'Staff',   'S-01',  '9876540001', 'staff'),
  (v_staff2,   'STAFF002',  'Meena Devi',        'Staff',   'S-02',  '9876540002', 'staff'),
  (v_admin,    'ADMIN001',  'Admin User',        'Admin',   'ADM-1', '9876540000', 'admin')
ON CONFLICT (id) DO UPDATE SET
  registration_id = EXCLUDED.registration_id,
  name            = EXCLUDED.name,
  hostel          = EXCLUDED.hostel,
  room_number     = EXCLUDED.room_number,
  phone           = EXCLUDED.phone,
  role            = EXCLUDED.role;

-- ── Laundry Bags ─────────────────────────────────────────────
INSERT INTO public.laundry_bags (id, bag_id, student_id, is_active)
VALUES
  (gen_random_uuid(), 'LND-1045', v_student1, true),
  (gen_random_uuid(), 'LND-1046', v_student2, true),
  (gen_random_uuid(), 'LND-1047', v_student3, true)
ON CONFLICT (bag_id) DO NOTHING
RETURNING id INTO v_bag1;

-- Re-fetch bag IDs by bag_id for order creation
SELECT id INTO v_bag1 FROM public.laundry_bags WHERE bag_id = 'LND-1045';
SELECT id INTO v_bag2 FROM public.laundry_bags WHERE bag_id = 'LND-1046';
SELECT id INTO v_bag3 FROM public.laundry_bags WHERE bag_id = 'LND-1047';

-- ── Sample Orders ─────────────────────────────────────────────
-- Order 1: Venkatesh — COMPLETED (ready for pickup)
INSERT INTO public.laundry_orders (
  id, order_id, student_id, bag_id, clothes_count, notes, status,
  submitted_at, received_at, processing_at, completed_at
) VALUES (
  gen_random_uuid(),
  'ORD-20261013-00001',
  v_student1, v_bag1, 18,
  'Please handle the white shirts carefully',
  'COMPLETED',
  now() - interval '3 days',
  now() - interval '2 days 20 hours',
  now() - interval '2 days',
  now() - interval '5 hours'
)
ON CONFLICT (order_id) DO NOTHING
RETURNING id INTO v_order1;

SELECT id INTO v_order1
FROM public.laundry_orders WHERE order_id = 'ORD-20261013-00001';

-- Order 2: Rahul — PROCESSING
INSERT INTO public.laundry_orders (
  id, order_id, student_id, bag_id, clothes_count, status,
  submitted_at, received_at, processing_at
) VALUES (
  gen_random_uuid(),
  'ORD-20261014-00001',
  v_student2, v_bag2, 22,
  'PROCESSING',
  now() - interval '2 days',
  now() - interval '1 day 22 hours',
  now() - interval '1 day'
)
ON CONFLICT (order_id) DO NOTHING
RETURNING id INTO v_order2;

SELECT id INTO v_order2
FROM public.laundry_orders WHERE order_id = 'ORD-20261014-00001';

-- Order 3: Priya — SUBMITTED (just submitted)
INSERT INTO public.laundry_orders (
  id, order_id, student_id, bag_id, clothes_count, notes, status,
  submitted_at
) VALUES (
  gen_random_uuid(),
  'ORD-20261015-00001',
  v_student3, v_bag3, 15,
  'All items are labelled',
  'SUBMITTED',
  now() - interval '2 hours'
)
ON CONFLICT (order_id) DO NOTHING
RETURNING id INTO v_order3;

SELECT id INTO v_order3
FROM public.laundry_orders WHERE order_id = 'ORD-20261015-00001';

-- ── Notifications ─────────────────────────────────────────────
-- Notification for Venkatesh whose laundry is COMPLETED
INSERT INTO public.notifications (
  student_id, laundry_order_id, title, message, type, is_read
)
SELECT
  v_student1, v_order1,
  'Laundry Ready for Pickup',
  'Your laundry has been completed. 18 clothes are ready for pickup.',
  'LAUNDRY_COMPLETED',
  false
WHERE v_order1 IS NOT NULL
ON CONFLICT (laundry_order_id, type) DO NOTHING;

-- ── Audit Logs ────────────────────────────────────────────────
-- Audit trail for Order 1
INSERT INTO public.audit_logs (user_id, laundry_order_id, action, old_status, new_status, created_at)
SELECT v_staff1, v_order1, 'STATUS_CHANGED', 'SUBMITTED',  'RECEIVED',   now() - interval '2 days 20 hours'
WHERE v_order1 IS NOT NULL;

INSERT INTO public.audit_logs (user_id, laundry_order_id, action, old_status, new_status, created_at)
SELECT v_staff1, v_order1, 'STATUS_CHANGED', 'RECEIVED',   'PROCESSING', now() - interval '2 days'
WHERE v_order1 IS NOT NULL;

INSERT INTO public.audit_logs (user_id, laundry_order_id, action, old_status, new_status, created_at)
SELECT v_staff2, v_order1, 'STATUS_CHANGED', 'PROCESSING', 'COMPLETED',  now() - interval '5 hours'
WHERE v_order1 IS NOT NULL;

-- Audit trail for Order 2
INSERT INTO public.audit_logs (user_id, laundry_order_id, action, old_status, new_status, created_at)
SELECT v_staff1, v_order2, 'STATUS_CHANGED', 'SUBMITTED',  'RECEIVED',   now() - interval '1 day 22 hours'
WHERE v_order2 IS NOT NULL;

INSERT INTO public.audit_logs (user_id, laundry_order_id, action, old_status, new_status, created_at)
SELECT v_staff1, v_order2, 'STATUS_CHANGED', 'RECEIVED',   'PROCESSING', now() - interval '1 day'
WHERE v_order2 IS NOT NULL;

END $$;
