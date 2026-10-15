# API Documentation — UNi LaunDRY

The MVP has no custom REST API. All data access is through the **Supabase JavaScript client** using the `anon` key with RLS-enforced access control. This document describes the Supabase RPCs (PostgreSQL functions) that enforce business logic server-side.

---

## Conventions

Base: Supabase project URL (configured via `VITE_SUPABASE_URL`).  
Authentication: Supabase JWT passed automatically by the Supabase JS client via `Authorization: Bearer <token>`.  
Error format: `{ code: string, message: string, details: string | null, hint: string | null }` — standard Supabase/PostgREST error shape.  
Pagination: Supabase `.range(from, to)` or `.limit(n).offset(m)`.  
Rate limits: Supabase default; production plan TBC.

---

## RPC — `advance_order_status`

Purpose: Advance a laundry order through a valid status transition. Enforces the transition matrix, writes timestamps, inserts an audit log row, and creates a notification if the new status is COMPLETED.

Required permission: `staff` or `admin` role (checked inside the function).

```sql
CREATE OR REPLACE FUNCTION advance_order_status(
  p_order_id UUID,
  p_new_status TEXT
)
RETURNS laundry_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order     laundry_orders;
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
BEGIN
  -- Resolve caller role
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

  IF v_caller_role NOT IN ('staff', 'admin') THEN
    RAISE EXCEPTION 'Forbidden: only staff or admin may advance order status';
  END IF;

  -- Lock the order row
  SELECT * INTO v_order FROM laundry_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate transition
  IF NOT is_valid_transition(v_order.status, p_new_status) THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_order.status, p_new_status;
  END IF;

  -- CANCELLED requires admin
  IF p_new_status = 'CANCELLED' AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Forbidden: only admin may cancel an order';
  END IF;

  -- Update order status and timestamp
  UPDATE laundry_orders
  SET
    status         = p_new_status,
    received_at    = CASE WHEN p_new_status = 'RECEIVED'    THEN now() ELSE received_at    END,
    processing_at  = CASE WHEN p_new_status = 'PROCESSING'  THEN now() ELSE processing_at  END,
    completed_at   = CASE WHEN p_new_status = 'COMPLETED'   THEN now() ELSE completed_at   END,
    picked_up_at   = CASE WHEN p_new_status = 'PICKED_UP'   THEN now() ELSE picked_up_at   END,
    updated_at     = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Write audit log
  INSERT INTO audit_logs (user_id, laundry_order_id, action, old_status, new_status)
  VALUES (v_caller_id, p_order_id, 'STATUS_CHANGED', v_order.status, p_new_status);

  -- Create notification if COMPLETED (idempotent via unique constraint)
  IF p_new_status = 'COMPLETED' THEN
    INSERT INTO notifications (student_id, laundry_order_id, title, message, type)
    SELECT
      v_order.student_id,
      v_order.id,
      'Laundry Ready for Pickup',
      'Your laundry has been completed. ' || v_order.clothes_count ||
      ' clothes are ready for pickup. Please collect your laundry from the laundry counter.',
      'LAUNDRY_COMPLETED'
    ON CONFLICT (laundry_order_id, type) DO NOTHING;
  END IF;

  RETURN v_order;
END;
$$;
```

Parameters:
- `p_order_id` UUID — the order to advance.
- `p_new_status` TEXT — one of `RECEIVED`, `PROCESSING`, `COMPLETED`, `PICKED_UP`, `CANCELLED`.

Success response: The updated `laundry_orders` row.  
Error responses:
- `Forbidden: only staff or admin may advance order status` — caller is a student or unauthenticated.
- `Order not found` — `p_order_id` does not exist.
- `Invalid transition: X → Y` — the transition is not in the valid matrix.
- `Forbidden: only admin may cancel an order` — caller is staff, not admin.

Side effects: Updates `laundry_orders`; inserts into `audit_logs`; inserts into `notifications` if COMPLETED.  
Idempotency: Duplicate call with the same `p_new_status` fails with "Invalid transition" (current status already equals target). Notification insert uses `ON CONFLICT DO NOTHING`.

---

## RPC — `is_valid_transition` (helper)

```sql
CREATE OR REPLACE FUNCTION is_valid_transition(from_status TEXT, to_status TEXT)
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
```

---

## Supabase Table Endpoints (via JS client)

These are the primary queries used by the frontend. All are subject to RLS.

### `laundry_orders`

**Fetch active student order:**
```typescript
supabase
  .from('laundry_orders')
  .select('*, laundry_bags(bag_id)')
  .eq('student_id', userId)
  .not('status', 'in', '("PICKED_UP","CANCELLED")')
  .single()
```

**Fetch student history (paginated):**
```typescript
supabase
  .from('laundry_orders')
  .select('id, order_id, clothes_count, status, submitted_at, completed_at, picked_up_at, laundry_bags(bag_id)')
  .eq('student_id', userId)
  .order('submitted_at', { ascending: false })
  .range(from, to)
```

**Staff: fetch all active orders:**
```typescript
supabase
  .from('laundry_orders')
  .select('*, profiles(name, registration_id), laundry_bags(bag_id)')
  .not('status', 'in', '("PICKED_UP","CANCELLED")')
  .order('submitted_at', { ascending: true })
  .range(from, to)
```

**Resolve QR token to active order (staff):**
```typescript
supabase
  .from('laundry_bags')
  .select('*, laundry_orders!inner(*, profiles(name, registration_id, hostel, room_number))')
  .eq('qr_token', token)
  .not('laundry_orders.status', 'in', '("PICKED_UP","CANCELLED")')
  .single()
```

**Admin: delayed orders:**
```typescript
const thresholdHours = ... // read from app_settings
supabase
  .from('laundry_orders')
  .select('*, profiles(name, registration_id), laundry_bags(bag_id)')
  .in('status', ['SUBMITTED', 'RECEIVED', 'PROCESSING'])
  .lt('submitted_at', new Date(Date.now() - thresholdHours * 3600000).toISOString())
  .order('submitted_at', { ascending: true })
```

### `notifications`

**Fetch student notifications:**
```typescript
supabase
  .from('notifications')
  .select('*')
  .eq('student_id', userId)
  .order('created_at', { ascending: false })
  .range(from, to)
```

**Mark notification as read:**
```typescript
supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)
  .eq('student_id', userId)  // safety: RLS also enforces this
```

### `app_settings`

**Read delay threshold:**
```typescript
supabase
  .from('app_settings')
  .select('value')
  .eq('key', 'delay_threshold_hours')
  .single()
```

---

## Realtime Subscriptions

**Student: subscribe to own order changes:**
```typescript
supabase
  .channel('student-orders')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'laundry_orders',
    filter: `student_id=eq.${userId}`
  }, handleOrderChange)
  .subscribe()
```

**Student: subscribe to own notifications:**
```typescript
supabase
  .channel('student-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `student_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe()
```

**Staff: subscribe to active orders (for dashboard count updates):**
```typescript
supabase
  .channel('staff-active-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'laundry_orders'
  }, handleOrderListChange)
  .subscribe()
```

Note: RLS ensures each subscription only delivers rows the authenticated user is authorised to see, even without client-side filters.

---

## Future — Cloudflare Worker Endpoint (if image uploads added)

If Cloudinary signed uploads are implemented, a Cloudflare Worker endpoint at `/api/cloudinary-sign` would accept a POST from the authenticated client, verify the Supabase JWT, and return a signed upload configuration. This endpoint must never be implemented in the React SPA — only in a server-side Worker.

This is not in scope for the MVP.
