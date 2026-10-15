# Testing — UNi LaunDRY

## 1. Testing Goals

Critical functionality that must be verified before any release:
- Student registration and login.
- Laundry submission (valid and invalid inputs).
- QR scan → order lookup → status update flow.
- Every valid status transition (Submitted → Received → Processing → Completed → Picked Up).
- Notification creation and real-time delivery on COMPLETED transition.
- RLS: no cross-student data leakage; no role escalation via direct API call.
- Status transition rejection: client cannot skip a step or move backwards.

---

## 2. Test Types

### Unit Testing
Test utility functions and business logic in isolation:
- `generateOrderId` produces the correct `ORD-YYYYMMDD-NNNNN` format.
- `getNextValidStatus` returns the correct next status for each current status (and null for terminal statuses).
- `isOrderDelayed(order, thresholdHours)` returns the correct boolean.
- `formatDate` and other date utilities.

### Integration Testing
Test Supabase interactions against a local Supabase instance (or test database):
- `fetchStudentOrders` returns only the calling student's orders.
- `advanceOrderStatus` accepts valid transitions and rejects invalid ones.
- Creating a notification via `advance_order_status` is idempotent (second call does not duplicate).
- `profiles_student_update` RLS policy blocks a `role` field change.

### End-to-End Testing (manual for MVP, automated in Phase 6)
Verify complete user journeys in the browser using real Supabase:
- Student registers, submits laundry, watches status update live, receives notification, views history.
- Staff logs in, scans QR, advances order through all statuses, marks pickup.
- Admin views dashboard counts, searches orders, views delayed laundry, changes settings.
- Security: attempt cross-student data access and confirm it is blocked.

---

## 3. Testing Tools

Unit/Integration: Vitest (matches Vite; fast, TypeScript-native).  
Component: React Testing Library (with Vitest).  
E2E (Phase 6): Playwright (chromium, mobile viewport preset).  
Local Supabase: `supabase start` (Docker) for integration tests against a real database.

---

## 4. Test File Structure

```
src/
└── __tests__/
    ├── unit/
    │   ├── utils/
    │   │   ├── generateOrderId.test.ts
    │   │   ├── statusHelpers.test.ts
    │   │   └── formatDate.test.ts
    │   └── hooks/
    │       └── useOrders.test.ts
    └── integration/
        ├── services/
        │   ├── orders.test.ts
        │   └── notifications.test.ts
        └── rls/
            ├── profilesRLS.test.ts
            ├── ordersRLS.test.ts
            └── notificationsRLS.test.ts

tests/e2e/
    ├── student.spec.ts
    ├── staff.spec.ts
    ├── admin.spec.ts
    └── security.spec.ts
```

---

## 5. Critical User Flows

### Flow 1 — Student Submit Laundry
Steps:
1. Student logs in.
2. Student navigates to Give Laundry.
3. Form shows assigned bag (auto-filled), current date/time, clothes count input.
4. Student enters `clothesCount = 12`, submits.
5. Confirmation is shown with the new order ID.
6. Student dashboard shows new order with status SUBMITTED.

Expected result: Order exists in `laundry_orders` with `status = 'SUBMITTED'` and correct `student_id`.  
Error cases: `clothesCount = 0` → validation error shown; `clothesCount = 'abc'` → validation error; duplicate submit click → only one order created.

### Flow 2 — Staff QR Scan and Status Advance
Steps:
1. Staff logs in.
2. Staff opens QR Scanner.
3. Staff scans bag QR.
4. Order details shown: student name, order ID, clothes count, current status.
5. Only the next valid action button is shown.
6. Staff taps action.
7. Status updates; audit log row is created.

Expected result: Order status advanced by one step; `audit_logs` row inserted with correct `user_id`, `old_status`, `new_status`.  
Error cases: Unknown QR token → "Unrecognised bag" message; camera denied → manual search shown.

### Flow 3 — Notification on COMPLETED
Steps:
1. Staff advances order to COMPLETED.
2. `notifications` row is inserted for the student.
3. Student's dashboard (open in another tab/device) updates live.
4. Notification badge increments.
5. Student opens Notifications page, sees the new notification, marks it read.

Expected result: Exactly one notification row; `is_read` changes to true after mark-read action.

### Flow 4 — RLS Cross-Student Isolation
Steps:
1. Student A logs in.
2. Student A calls `supabase.from('laundry_orders').select('*')` directly.
3. Response contains only Student A's orders.
4. Student A calls `supabase.from('laundry_orders').select('*').eq('student_id', <student_B_id>)` → returns empty array (not an error, just no rows).

Expected result: No row from Student B's data is returned.

### Flow 5 — Role Escalation Blocked
Steps:
1. Student A calls `supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.uid())`.
2. Request is rejected by RLS (WITH CHECK clause blocks role change).

Expected result: Supabase returns a permission error; student's role remains `student`.

---

## 6. Coverage

Target: High coverage for utility functions and RLS tests; pragmatic coverage for service functions.

Prioritise:
- `utils/statusHelpers.ts` — 100% (small, pure functions, critical logic).
- `services/orders.ts` — happy path + known failure paths.
- RLS tests — every table, every role combination from §5 of SECURITY.md.
- `advance_order_status` RPC — valid transitions, invalid transitions, cancellation permissions.

Do not chase line coverage metrics at the expense of meaningful test cases.

---

## 7. Commands

```
npm run test           # Run all Vitest unit/integration tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run build          # Production build (Vite)
npx playwright test    # E2E tests (requires local Supabase running)
```

---

## 8. Security Tests (Manual, Phase 6)

Run these manually against a local Supabase with test accounts:

| Test                                             | Expected result               |
|--------------------------------------------------|-------------------------------|
| Student reads another student's orders via API   | Empty array (no rows)         |
| Student updates `role` field in own profile      | RLS rejects, role unchanged   |
| Student calls `advance_order_status` directly    | RPC rejects (not staff/admin) |
| Staff reads `notifications` table                | Empty / no rows               |
| Staff reads `app_settings` for delay threshold   | Returns the threshold value   |
| Unauthenticated call to `laundry_orders`         | Returns empty (anon RLS)      |
| Staff skips RECEIVED and calls PROCESSING        | RPC rejects invalid transition|
| Admin cancels an order                           | Succeeds; audit log written   |
| Staff cancels an order                           | RPC rejects (admin only)      |

Document any tests that could not be run and why.

---

## 9. Definition of Done

- [ ] All Vitest tests pass (`npm run test`).
- [ ] Build succeeds with no TypeScript errors (`npm run build`).
- [ ] ESLint passes with no warnings (`npm run lint`).
- [ ] All RLS security tests pass (no cross-student leakage, no role escalation).
- [ ] Critical flows (submit, scan, status advance, notification, pickup) manually verified end-to-end.
- [ ] Responsive layout checked at 375 px, 768 px, 1280 px in Chrome DevTools.
- [ ] No blocking console errors in production build.
