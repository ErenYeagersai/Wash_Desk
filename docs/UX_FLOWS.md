# UX Flows — UNi LaunDRY

All flows are documented with loading, empty, success, and error states.

---

## Public Flows

### Flow 1 — Landing Page
1. Unauthenticated user opens the app.
2. Landing page shows: product name, one-line description, "Log In" and "Register" buttons.
3. User taps "Log In" → `/login`.
4. User taps "Register" → `/register`.

Loading: Instant (no async data).  
Empty: N/A.

---

### Flow 2 — Student Registration
1. User opens `/register`.
2. Form shown: Registration ID, Full name, Hostel/block, Room number, Phone, Email, Password, Confirm Password.
3. User fills form and submits.
4. Frontend validates: all fields required; email format; phone ≥ 10 digits; password ≥ 8 chars; passwords match.
5. Supabase Auth `signUp` is called.
6. Trigger creates `profiles` row with `role = 'student'`.
7. User is redirected to Student Dashboard.

Loading: Submit button shows spinner; disabled during request.  
Error — duplicate email: "This email is already registered. Log in instead."  
Error — duplicate registration_id: "This Registration ID is already taken."  
Error — validation: Inline error below each failing field.  
Success: Redirect to `/student/dashboard` with a welcome toast.

---

### Flow 3 — Login
1. User opens `/login`.
2. Form shown: Email, Password, "Log In" button.
3. User submits.
4. Supabase Auth validates credentials.
5. On success: profile is fetched → role-based redirect.
   - `student` → `/student/dashboard`
   - `staff` → `/staff/dashboard`
   - `admin` → `/admin/dashboard`

Loading: Button disabled with spinner.  
Error — wrong credentials: "Incorrect email or password."  
Error — unverified: "Please verify your email before logging in." (if email confirmation is enabled).  
Error — network: "Connection failed. Please try again."

---

## Student Flows

### Flow 4 — Student Dashboard
1. Student lands on `/student/dashboard`.
2. Page loads: greeting with name, current active order card (or "No active laundry" empty state), completed-awaiting-pickup card (if any), recent history (last 3 orders), notification badge.
3. "Give Laundry" button is prominent (top of page or floating action button on mobile).

Loading: Skeleton cards while orders load.  
Empty: "No active laundry. Ready to submit?" with "Give Laundry" button.  
Realtime: If staff updates an order, the card updates without page refresh.

---

### Flow 5 — Submit Laundry (Give Laundry)
1. Student taps "Give Laundry".
2. Form shown:
   - Assigned bag: `LND-1045` (read-only, fetched from `laundry_bags`).
   - Submission date/time: auto-filled, read-only.
   - Clothes count: number input (min 1).
   - Notes: optional textarea.
3. Student enters clothes count and optional notes.
4. Submit button tapped.
5. Client validates: clothes_count ≥ 1.
6. Supabase insert called with idempotency guard (button disabled immediately).
7. Order created; confirmation screen shown with order ID.

Loading: Button spinner during submit.  
Error — bag not assigned: "No bag is assigned to your account. Please contact the laundry desk."  
Error — active order exists: "You already have an active order (LND-1045). Complete or collect it first."  
Error — invalid clothes count: "Please enter a valid number of clothes."  
Success: "Your laundry has been submitted! Order #ORD-20261015-00125" → link to Current Laundry.

---

### Flow 6 — Current Laundry and Status Tracking
1. Student navigates to `/student/laundry/current`.
2. Active order card shows: order ID, bag ID, clothes count, notes, status, timestamps for each completed stage.
3. Progress stepper shows current stage (✓ Submitted → ✓ Received → ● Processing → ○ Completed → ○ Picked Up).
4. When status changes (Realtime), the stepper animates to the new stage.

Loading: Skeleton stepper while order loads.  
Empty: "No active laundry" with "Give Laundry" CTA.

---

### Flow 7 — Notifications
1. Student opens notifications (bell icon or bottom nav).
2. List of notifications shown, newest first. Unread notifications are visually distinct (bold, coloured dot).
3. Student taps a notification → navigated to the relevant order detail.
4. Notification is marked as read automatically on tap.
5. "Mark all as read" button.

Loading: Skeleton list.  
Empty: "No notifications yet."

---

### Flow 8 — My Bag QR
1. Student navigates to `/student/bag`.
2. Their assigned bag is shown: bag ID (`LND-1045`), QR code image.
3. "Download QR" button saves a PNG (bag ID + QR code + "UNIVERSITY LAUNDRY" label).

Loading: Skeleton while bag is fetched.  
Empty — no bag assigned: "No bag has been assigned to you yet. Contact the laundry desk."

---

### Flow 9 — Laundry History
1. Student navigates to `/student/history`.
2. Paginated list of all orders, newest first.
3. Each row: order ID, bag ID, clothes count, submitted date, completed date, pickup date, status badge.
4. Filter controls: date range picker, status dropdown.

Loading: Skeleton rows.  
Empty: "No laundry history yet."  
Filter empty: "No orders match your filters."

---

## Staff Flows

### Flow 10 — Staff Dashboard
1. Staff logs in, lands on `/staff/dashboard`.
2. Stat cards shown (database-backed): Submitted, Received, Processing, Completed (pending pickup).
3. Priority queue of active orders sorted by submitted_at ascending (oldest first).
4. Prominent "Scan Bag" button.

Loading: Skeleton cards and list.  
Empty: "No active laundry. All caught up!"

---

### Flow 11 — QR Scan
1. Staff taps "Scan Bag".
2. Camera permission is requested.
   - Denied: show "Camera access is required for scanning. Use manual search instead" → manual search shown.
   - Not supported (e.g., desktop without camera): skip to manual search automatically.
3. Camera activates; scanner frame overlaid.
4. Staff holds QR code in front of camera.
5. QR decoded → `qr_token` extracted.
6. Supabase call: fetch `laundry_bags` by `qr_token` → get associated active order.
7. Order detail shown: student name, order ID, bag ID, clothes count, current status, timestamps.
8. One action button shown: the next valid status transition.
9. Staff taps action → `advance_order_status` RPC called.
10. Success toast shown; order status updated.
11. Staff can scan next bag or return to dashboard.

Error — unknown token: "This QR code is not recognised. Use manual search."  
Error — no active order: "Bag LND-1045 has no active order. View history?" with link.  
Error — network: "Update failed. Please try again."  
Loading: Spinner while Supabase call resolves.

---

### Flow 12 — Manual Search
1. Staff opens search (accessible from QR scan fallback or sidebar nav).
2. Search input accepts: Registration ID, Bag ID, Order ID, or student name.
3. Debounced search (300 ms) queries Supabase.
4. Results list shows matching orders with student name, order ID, status.
5. Staff taps a result → order detail page with action button.

Loading: Skeleton results.  
Empty — no query: "Search by Registration ID, Bag ID, Order ID, or student name."  
Empty — no results: "No orders found for '[query]'."

---

### Flow 13 — Staff Order Detail and Status Update
1. Staff views order detail (from scan or search result).
2. Full order info shown: student name, reg ID, hostel, room, order ID, bag ID, clothes count, notes, status timeline with timestamps.
3. Action button: next valid status only (e.g., "Mark Received", "Start Processing", "Mark Completed", "Mark Picked Up").
4. Staff taps action → confirmation modal ("Mark this order as Received?") → confirm.
5. `advance_order_status` RPC called.
6. Status updated; timeline updates; success toast.

Error — transition rejected: "This status change is not allowed." (should never happen in normal use).

---

## Admin Flows

### Flow 14 — Admin Dashboard
1. Admin logs in, lands on `/admin/dashboard`.
2. Six stat cards: Total students, Active laundry, Processing, Completed, Pending pickup, Delayed.
3. Recent orders table (last 20).
4. Quick links to Delayed Laundry and Reports.

Loading: Skeleton stats.

---

### Flow 15 — Delayed Laundry
1. Admin navigates to `/admin/delayed`.
2. Reads `delay_threshold_hours` from `app_settings`.
3. Shows all orders where `status IN ('SUBMITTED','RECEIVED','PROCESSING')` AND `submitted_at < now() - interval`.
4. Each row shows: order ID, student name, reg ID, bag ID, current status, hours elapsed.
5. Admin can click an order to view its full detail and audit log.

Loading: Skeleton table.  
Empty: "No delayed laundry. Everything is on time!"

---

### Flow 16 — Admin Settings
1. Admin navigates to `/admin/settings`.
2. "Delay threshold" field shows current value (e.g., 48 hours).
3. Admin changes value, saves.
4. `app_settings` row updated; change logged.

---

### Flow 17 — Manage Students / Staff / Bags / Orders
All management pages follow the same pattern:
1. Paginated, searchable table.
2. Create button (for bags and staff accounts).
3. Row actions: view, edit, deactivate.
4. Confirmation modal for destructive actions.

Bags: Admin can assign a bag to a student, regenerate a `qr_token`, or mark a bag inactive.  
Staff: Admin creates staff accounts (sets `role = 'staff'` in profiles; Supabase Auth invite sent).  
Students: Admin can view details; cannot delete (only deactivate if needed in future).  
Orders: Admin can view full detail and audit log; can cancel an order (CANCELLED status).
