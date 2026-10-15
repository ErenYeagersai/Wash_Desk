# Security Guidelines — UNi LaunDRY

## 1. Authentication

Authentication Provider: Supabase Auth  
Methods:
- Email / password (primary, MVP)
- Magic link (future option, not in MVP)

Session management:
- Supabase issues a JWT on sign-in; the client stores it in `localStorage` via the Supabase JS client.
- Tokens auto-refresh via the Supabase client's built-in token rotation.
- On auth state change (`supabase.auth.onAuthStateChange`), the frontend reads the user's `profiles` row to get their `role`.
- Expired or invalid sessions redirect to `/login`; no partial data is shown.

---

## 2. Authorization

Roles: `student`, `staff`, `admin`

### student
- View and update their own `profiles` row (except `role`).
- View their own `laundry_bags` row.
- Insert a new `laundry_orders` row where `student_id = auth.uid()`.
- View their own `laundry_orders` rows.
- View and mark-as-read their own `notifications` rows.
- Cannot update `status` on any order directly (no UPDATE permission on `laundry_orders.status`).
- Cannot access another student's data.

### staff
- View all `profiles` rows (name, registration_id, hostel, room — operational fields only).
- View all `laundry_bags` rows (for QR scan resolution).
- View all `laundry_orders` rows.
- Call `advance_order_status` RPC to advance an order through valid transitions.
- Cannot insert or delete bags or profiles.
- Cannot change any `role`.
- Cannot read or write `notifications` or `app_settings`.

### admin
- Full access to all tables with appropriate SELECT / INSERT / UPDATE / DELETE.
- Can update `profiles.role` (to promote staff or demote a user).
- Can cancel any order (via RPC that allows the CANCELLED transition).
- Can manage `app_settings` (e.g., delay threshold).
- Cannot delete `audit_logs` rows.

Authorization is enforced at the database level via PostgreSQL Row Level Security. Frontend role-based routing is a UX convenience only; it is not a security boundary.

---

## 3. Secrets

- Never hard-code credentials in source files.
- Never commit `.env` files containing real values.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are genuinely public values safe for the browser. They grant access only through RLS-enforced calls.
- The Supabase **service-role key** must never appear in any `VITE_*` variable, any client-side file, or any repository commit.
- If a Cloudflare Worker is added later for server-side endpoints, store private keys (e.g., service-role key) in Cloudflare environment secrets, not in the wrangler.toml file.
- Rotate any accidentally exposed key immediately via Supabase dashboard.

---

## 4. Environment Variables

Public (safe to expose in browser build):
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Private (server-side only, never in VITE_* prefix):
```
SUPABASE_SERVICE_ROLE_KEY   # Only if a Worker endpoint needs it
CLOUDINARY_API_SECRET       # Only if signed uploads are implemented
```

---

## 5. Row Level Security Policies

RLS is enabled on every table. All policies must be tested before deployment.

### `profiles`
```sql
-- Students read their own row
CREATE POLICY profiles_student_select ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Staff read all profiles (read-only)
CREATE POLICY profiles_staff_select ON profiles FOR SELECT
  USING (get_my_role() = 'staff');

-- Admin reads all
CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (get_my_role() = 'admin');

-- Students update own row but cannot change role
CREATE POLICY profiles_student_update ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
```

### `laundry_bags`
```sql
-- Students see their own bag
CREATE POLICY bags_student_select ON laundry_bags FOR SELECT
  USING (student_id = auth.uid());

-- Staff see all bags (for QR scan)
CREATE POLICY bags_staff_select ON laundry_bags FOR SELECT
  USING (get_my_role() = 'staff');

-- Admin full access
CREATE POLICY bags_admin_all ON laundry_bags FOR ALL
  USING (get_my_role() = 'admin');
```

### `laundry_orders`
```sql
-- Students see own orders
CREATE POLICY orders_student_select ON laundry_orders FOR SELECT
  USING (student_id = auth.uid());

-- Students insert own orders (student_id must match uid)
CREATE POLICY orders_student_insert ON laundry_orders FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students cannot UPDATE orders (status changes via RPC only)
-- No UPDATE policy for students.

-- Staff see all orders
CREATE POLICY orders_staff_select ON laundry_orders FOR SELECT
  USING (get_my_role() = 'staff');

-- Staff cannot direct UPDATE (must use RPC advance_order_status)
-- advance_order_status RPC runs as SECURITY DEFINER.

-- Admin full access
CREATE POLICY orders_admin_all ON laundry_orders FOR ALL
  USING (get_my_role() = 'admin');
```

### `notifications`
```sql
-- Students see own notifications
CREATE POLICY notif_student_select ON notifications FOR SELECT
  USING (student_id = auth.uid());

-- Students mark own notifications as read
CREATE POLICY notif_student_update ON notifications FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admin full access
CREATE POLICY notif_admin_all ON notifications FOR ALL
  USING (get_my_role() = 'admin');
```

### `audit_logs`
```sql
-- No direct INSERT from clients (only via SECURITY DEFINER RPC)
-- Staff SELECT only
CREATE POLICY audit_staff_select ON audit_logs FOR SELECT
  USING (get_my_role() IN ('staff', 'admin'));
-- No UPDATE or DELETE for anyone
```

### `app_settings`
```sql
-- Admin full access
CREATE POLICY settings_admin_all ON app_settings FOR ALL
  USING (get_my_role() = 'admin');

-- Staff/student read delay threshold only
CREATE POLICY settings_read ON app_settings FOR SELECT
  USING (get_my_role() IN ('staff', 'student') AND key = 'delay_threshold_hours');
```

### Helper function
```sql
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;
```

---

## 6. RPC Security

`advance_order_status(order_id UUID, new_status TEXT)` runs as `SECURITY DEFINER` (bypasses caller's RLS to write audit logs and notifications atomically). The function internally validates:
1. Caller is authenticated.
2. Caller's role is `staff` or `admin`.
3. The transition from `current_status → new_status` is valid.
4. For CANCELLED: caller must be `admin`.

The function raises an exception and rolls back on any validation failure.

---

## 7. QR Code Security

- QR tokens are UUIDs generated server-side at bag creation. They do not encode student names, registration IDs, room numbers, or any other personal data.
- Scanning a QR token and calling `laundry_bags.select(...).eq('qr_token', token)` requires a valid JWT with a `staff` or `admin` role. An unauthenticated or student-role JWT cannot resolve bag details from a token.
- A lost or stolen physical bag exposes only an opaque UUID. The admin can regenerate the `qr_token` (invalidating the old printed tag) without affecting student data.

---

## 8. API Security

- All Supabase calls use the `anon` key (safe for browser). RLS is the access control layer.
- Never expose the `service_role` key in any frontend code or client-reachable endpoint.
- Rate limiting: Supabase applies default rate limits. For production, configure Supabase Auth rate limits on sign-up/sign-in endpoints.
- CORS: Supabase handles CORS; the custom Cloudflare Worker (if added) must explicitly configure allowed origins.
- Input validation: All user inputs are validated client-side for UX, and must also be validated server-side (DB constraints + RPC guards).

---

## 9. Data Protection

Sensitive fields and their protections:

| Field         | Protection                                         |
|---------------|----------------------------------------------------|
| Passwords     | Managed entirely by Supabase Auth; never seen by app |
| Phone         | RLS: own row + admin only                          |
| Room number   | RLS: own row + staff (SELECT) + admin              |
| QR token      | Opaque UUID; JWT required to resolve               |
| Email         | Stored in auth.users; not duplicated in profiles   |

Retention: No automated deletion in MVP. Dormant accounts are deactivated by admin.  
Data minimisation: Profiles do not store email (it is in auth.users). No analytics or tracking SDKs.

---

## 10. Logging

Never log:
- Passwords or password reset tokens.
- Supabase JWT tokens.
- Full phone numbers in error traces.
- Supabase service-role key.

Log (via audit_logs table):
- Every status transition (who, what, when).
- Role changes (future — currently manual).

Browser console: No sensitive data in production `console.log` calls. Use a build-time strip for console.log in production.

---

## 11. Security Checklist

- [ ] RLS enabled on all tables and tested (including edge cases in §5).
- [ ] `get_my_role()` helper function deployed and used by all policies.
- [ ] `advance_order_status` RPC validates transitions and runs as SECURITY DEFINER.
- [ ] No service-role key in any `VITE_*` variable or committed file.
- [ ] Student cannot set `role` via profile update.
- [ ] Student cannot read another student's orders via direct Supabase query.
- [ ] Staff cannot access `notifications` or `app_settings`.
- [ ] QR token encodes no personal data.
- [ ] Expired JWT redirects to login.
- [ ] All form inputs validated server-side (DB constraints + RPC guards).
- [ ] Camera/QR scan errors handled gracefully with manual fallback.
- [ ] No `console.log` of sensitive data in production build.
