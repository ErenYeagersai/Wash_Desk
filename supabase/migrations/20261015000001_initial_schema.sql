-- ============================================================
-- UNi LaunDRY — Initial Schema
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Shared updated_at trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- One row per auth.users entry. Created by the handle_new_user trigger.
CREATE TABLE public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id TEXT        UNIQUE NOT NULL,
  name            TEXT        NOT NULL,
  hostel          TEXT        NOT NULL,
  room_number     TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'student'
                              CHECK (role IN ('student', 'staff', 'admin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: create profiles row on new auth user (public registration → always 'student')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, registration_id, name, hostel, room_number, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'registration_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'hostel', ''),
    COALESCE(NEW.raw_user_meta_data->>'room_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'student'   -- public registration is always student; admin sets staff/admin roles manually
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── laundry_bags ─────────────────────────────────────────────
CREATE TABLE public.laundry_bags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id      TEXT        UNIQUE NOT NULL,           -- human-readable, e.g. LND-1045
  student_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  qr_token    UUID        UNIQUE NOT NULL DEFAULT gen_random_uuid(), -- encoded in QR; opaque
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER bags_updated_at
  BEFORE UPDATE ON public.laundry_bags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.laundry_bags ENABLE ROW LEVEL SECURITY;

-- One active bag assignment per student
CREATE UNIQUE INDEX uq_student_active_bag
  ON public.laundry_bags (student_id)
  WHERE is_active = true AND student_id IS NOT NULL;

-- ── laundry_orders ───────────────────────────────────────────
CREATE TABLE public.laundry_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT        UNIQUE NOT NULL,          -- e.g. ORD-20261015-00001
  student_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bag_id        UUID        NOT NULL REFERENCES public.laundry_bags(id) ON DELETE RESTRICT,
  clothes_count INTEGER     NOT NULL CHECK (clothes_count > 0),
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'SUBMITTED'
                            CHECK (status IN (
                              'SUBMITTED','RECEIVED','PROCESSING',
                              'COMPLETED','PICKED_UP','CANCELLED'
                            )),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at   TIMESTAMPTZ,
  processing_at TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  picked_up_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.laundry_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.laundry_orders ENABLE ROW LEVEL SECURITY;

-- One active order per bag at a time
CREATE UNIQUE INDEX uq_bag_active_order
  ON public.laundry_orders (bag_id)
  WHERE status NOT IN ('PICKED_UP', 'CANCELLED');

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE public.notifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  laundry_order_id  UUID        NOT NULL REFERENCES public.laundry_orders(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  message           TEXT        NOT NULL,
  type              TEXT        NOT NULL DEFAULT 'LAUNDRY_COMPLETED',
  is_read           BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Idempotency: one notification per order per event type
CREATE UNIQUE INDEX uq_notification_per_order_type
  ON public.notifications (laundry_order_id, type);

-- ── audit_logs ────────────────────────────────────────────────
-- Immutable; no updated_at. Records every status change.
CREATE TABLE public.audit_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  laundry_order_id  UUID        NOT NULL REFERENCES public.laundry_orders(id) ON DELETE RESTRICT,
  action            TEXT        NOT NULL,
  old_status        TEXT,
  new_status        TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ── app_settings ──────────────────────────────────────────────
CREATE TABLE public.app_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Seed configurable limits (all admin-editable from Settings page)
INSERT INTO public.app_settings (key, value) VALUES
  ('delay_threshold_hours', '48'),
  ('monthly_bag_limit',     '4'),
  ('min_clothes',           '15'),
  ('max_clothes',           '25');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_registration_id ON public.profiles (registration_id);
CREATE INDEX idx_profiles_role            ON public.profiles (role);
CREATE INDEX idx_bags_student_id          ON public.laundry_bags (student_id);
CREATE INDEX idx_bags_qr_token            ON public.laundry_bags (qr_token);
CREATE INDEX idx_orders_student_id        ON public.laundry_orders (student_id);
CREATE INDEX idx_orders_bag_id            ON public.laundry_orders (bag_id);
CREATE INDEX idx_orders_status            ON public.laundry_orders (status);
CREATE INDEX idx_orders_submitted_at      ON public.laundry_orders (submitted_at DESC);
CREATE INDEX idx_notifications_student    ON public.notifications (student_id, is_read);
CREATE INDEX idx_audit_order_id           ON public.audit_logs (laundry_order_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Role lookup (SECURITY DEFINER to bypass RLS on profiles)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Valid transition check (pure / immutable)
CREATE OR REPLACE FUNCTION public.is_valid_transition(from_status TEXT, to_status TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT (from_status, to_status) IN (
    ('SUBMITTED',  'RECEIVED'),
    ('RECEIVED',   'PROCESSING'),
    ('PROCESSING', 'COMPLETED'),
    ('COMPLETED',  'PICKED_UP'),
    ('SUBMITTED',  'CANCELLED'),
    ('RECEIVED',   'CANCELLED'),
    ('PROCESSING', 'CANCELLED'),
    ('COMPLETED',  'CANCELLED')
  );
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────

-- Students can read their own profile
CREATE POLICY "profiles: student reads own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Staff can read all profiles (operational lookup)
CREATE POLICY "profiles: staff reads all"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'staff');

-- Admins have full access
CREATE POLICY "profiles: admin full"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- Students can update their own non-role fields
CREATE POLICY "profiles: student updates own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Block role escalation: new role must equal current role
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ── laundry_bags ─────────────────────────────────────────────

CREATE POLICY "bags: student reads own"
  ON public.laundry_bags FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "bags: staff reads all"
  ON public.laundry_bags FOR SELECT
  USING (public.get_my_role() = 'staff');

CREATE POLICY "bags: admin full"
  ON public.laundry_bags FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── laundry_orders ───────────────────────────────────────────

CREATE POLICY "orders: student reads own"
  ON public.laundry_orders FOR SELECT
  USING (student_id = auth.uid());

-- INSERT is handled exclusively via submit_laundry_order RPC (SECURITY DEFINER)
-- No student INSERT policy — the RPC writes as function owner.

CREATE POLICY "orders: staff reads all"
  ON public.laundry_orders FOR SELECT
  USING (public.get_my_role() = 'staff');

CREATE POLICY "orders: admin full"
  ON public.laundry_orders FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── notifications ─────────────────────────────────────────────

CREATE POLICY "notifications: student reads own"
  ON public.notifications FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "notifications: student marks read"
  ON public.notifications FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "notifications: admin full"
  ON public.notifications FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── audit_logs ────────────────────────────────────────────────

-- Only staff/admin can read; no one can modify (INSERT via RPC only)
CREATE POLICY "audit_logs: staff+admin reads"
  ON public.audit_logs FOR SELECT
  USING (public.get_my_role() IN ('staff', 'admin'));

-- ── app_settings ──────────────────────────────────────────────

-- Authenticated users can read (needed for displaying limits in the UI)
CREATE POLICY "settings: authenticated reads"
  ON public.app_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can write
CREATE POLICY "settings: admin writes"
  ON public.app_settings FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- RPC: submit_laundry_order
-- Called by students instead of a direct INSERT on laundry_orders.
-- Enforces monthly limit, clothes min/max, and active-order constraint.
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_laundry_order(
  p_bag_id       UUID,
  p_clothes_count INTEGER,
  p_notes        TEXT DEFAULT NULL
)
RETURNS public.laundry_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id    UUID    := auth.uid();
  v_bag           public.laundry_bags;
  v_order         public.laundry_orders;
  v_monthly_limit INTEGER;
  v_min_clothes   INTEGER;
  v_max_clothes   INTEGER;
  v_monthly_count INTEGER;
  v_order_id      TEXT;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify bag belongs to this student and is active
  SELECT * INTO v_bag
  FROM public.laundry_bags
  WHERE id = p_bag_id AND student_id = v_student_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bag not found or not assigned to your account';
  END IF;

  -- Read configurable limits (COALESCE to safe defaults if key missing)
  SELECT COALESCE(
    (SELECT value::INTEGER FROM public.app_settings WHERE key = 'monthly_bag_limit'), 4
  ) INTO v_monthly_limit;

  SELECT COALESCE(
    (SELECT value::INTEGER FROM public.app_settings WHERE key = 'min_clothes'), 15
  ) INTO v_min_clothes;

  SELECT COALESCE(
    (SELECT value::INTEGER FROM public.app_settings WHERE key = 'max_clothes'), 25
  ) INTO v_max_clothes;

  -- Validate clothes count
  IF p_clothes_count < v_min_clothes OR p_clothes_count > v_max_clothes THEN
    RAISE EXCEPTION 'Clothes count must be between % and %', v_min_clothes, v_max_clothes;
  END IF;

  -- Count this student's non-cancelled orders in the current calendar month
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.laundry_orders
  WHERE student_id = v_student_id
    AND status <> 'CANCELLED'
    AND submitted_at >= date_trunc('month', now())
    AND submitted_at <  date_trunc('month', now()) + interval '1 month';

  IF v_monthly_count >= v_monthly_limit THEN
    RAISE EXCEPTION 'Monthly submission limit of % reached. Resets on the 1st of next month.', v_monthly_limit;
  END IF;

  -- Ensure no active order already exists for this bag
  IF EXISTS (
    SELECT 1 FROM public.laundry_orders
    WHERE bag_id = p_bag_id
      AND status NOT IN ('PICKED_UP', 'CANCELLED')
  ) THEN
    RAISE EXCEPTION 'This bag already has an active order';
  END IF;

  -- Generate order ID: ORD-YYYYMMDD-NNNNN (sequence within day, UNIQUE constraint catches races)
  SELECT 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
    LPAD(
      (
        SELECT (COUNT(*) + 1)::TEXT
        FROM public.laundry_orders
        WHERE order_id LIKE 'ORD-' || to_char(now(), 'YYYYMMDD') || '-%'
      ),
      5, '0'
    )
  INTO v_order_id;

  INSERT INTO public.laundry_orders (
    order_id, student_id, bag_id, clothes_count, notes, status, submitted_at
  ) VALUES (
    v_order_id, v_student_id, p_bag_id, p_clothes_count, p_notes, 'SUBMITTED', now()
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- ============================================================
-- RPC: advance_order_status
-- Called by staff/admin to move an order to the next valid status.
-- Writes the audit log and creates notifications atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION public.advance_order_status(
  p_order_id  UUID,
  p_new_status TEXT
)
RETURNS public.laundry_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_order       public.laundry_orders;
  v_old_status  TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_role NOT IN ('staff', 'admin') THEN
    RAISE EXCEPTION 'Forbidden: only staff or admin may advance order status';
  END IF;

  -- Lock the row to prevent concurrent transitions
  SELECT * INTO v_order FROM public.laundry_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_old_status := v_order.status;

  IF NOT public.is_valid_transition(v_old_status, p_new_status) THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_old_status, p_new_status;
  END IF;

  IF p_new_status = 'CANCELLED' AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Forbidden: only admin may cancel an order';
  END IF;

  -- Update order
  UPDATE public.laundry_orders SET
    status        = p_new_status,
    received_at   = CASE WHEN p_new_status = 'RECEIVED'   THEN now() ELSE received_at   END,
    processing_at = CASE WHEN p_new_status = 'PROCESSING' THEN now() ELSE processing_at END,
    completed_at  = CASE WHEN p_new_status = 'COMPLETED'  THEN now() ELSE completed_at  END,
    picked_up_at  = CASE WHEN p_new_status = 'PICKED_UP'  THEN now() ELSE picked_up_at  END,
    updated_at    = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Immutable audit entry
  INSERT INTO public.audit_logs (user_id, laundry_order_id, action, old_status, new_status)
  VALUES (v_caller_id, p_order_id, 'STATUS_CHANGED', v_old_status, p_new_status);

  -- Notification on COMPLETED (idempotent via unique index)
  IF p_new_status = 'COMPLETED' THEN
    INSERT INTO public.notifications (
      student_id, laundry_order_id, title, message, type
    )
    SELECT
      v_order.student_id,
      v_order.id,
      'Laundry Ready for Pickup',
      'Your laundry has been completed. ' || v_order.clothes_count::TEXT ||
        ' clothes are ready for pickup. Please collect from the laundry counter.',
      'LAUNDRY_COMPLETED'
    ON CONFLICT (laundry_order_id, type) DO NOTHING;
  END IF;

  RETURN v_order;
END;
$$;

-- ============================================================
-- RPC: mark_all_notifications_read
-- Convenience function for the student "mark all read" button.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true
  WHERE student_id = auth.uid() AND is_read = false;
$$;
