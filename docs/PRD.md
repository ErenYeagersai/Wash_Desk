# Product Requirements Document — UNi LaunDRY

## 1. Product Overview

Product Name: UNi LaunDRY  
One-Line Description: A university hostel laundry management platform that gives students real-time visibility into their laundry status and gives staff a fast, scan-first workflow to track every bag from submission to pickup.  
Product Type: Internal SaaS Web Application  
Primary Platform: Web (mobile-first, responsive)

---

## 2. Problem

Hostel students submit laundry and have no reliable way to know whether it was received, is being processed, has been completed, or is ready for collection. Staff identify bags manually and track status in ad-hoc ways. Both sides waste time on avoidable check-ins.

Required workflow:  
**Submitted → Received → Processing → Completed → Picked Up**

---

## 3. Goals

Primary Goal: Give every student real-time, trustworthy visibility into their laundry status from submission to pickup, with zero manual follow-up.

Secondary Goals:
- Give laundry staff a fast scan-first workflow that requires minimal typing.
- Give admins a live dashboard of active orders, delays, and staff actions.
- Build a secure, auditable system where every status change is logged.

---

## 4. Target Users

### Student
Description: A university hostel resident who submits laundry and tracks it.  
Needs:
- Know their laundry's current status without asking anyone.
- Submit new laundry quickly.
- Receive a notification when laundry is ready for pickup.
- View past orders.

Pain Points:
- Currently has no visibility after dropping off laundry.
- Cannot tell if laundry is lost, delayed, or just slow.

### Laundry Staff
Description: A hostel staff member who receives, processes, and returns laundry bags.  
Needs:
- Identify a bag by scanning its QR code or searching.
- Update status with one tap (Received / Processing / Completed / Picked Up).
- See a prioritised list of what needs action.

Pain Points:
- Currently relies on manual lists or memory.
- Needs a fast flow with minimal typing, especially on mobile.

### Admin
Description: A hostel administrator who manages students, staff, bags, and reports.  
Needs:
- Live dashboard with counts for all statuses and delays.
- Ability to search, filter, and manage any record.
- Audit trail for every status change.
- Configurable delay threshold.

Pain Points:
- No consolidated view of what is late or uncollected.
- No audit trail of who updated what.

---

## 5. User Stories

As a student, I want to submit my laundry so that it is registered in the system.  
As a student, I want to see the live status of my laundry so that I know when to collect it.  
As a student, I want to receive a notification when my laundry is ready so that I do not have to check manually.  
As a student, I want to view my laundry bag's QR code so that it is always attached to my bag.  
As a student, I want to see my laundry history so that I can track past orders.

As staff, I want to scan a bag's QR code so that I can identify it instantly without typing.  
As staff, I want to see only the next valid action for an order so that I cannot make an invalid transition.  
As staff, I want to search by Registration ID, Bag ID, or Order ID as a fallback when scanning fails.  
As staff, I want to see all orders that need action so that I can prioritise my workload.

As an admin, I want to see live counts of all laundry statuses so that I can identify bottlenecks.  
As an admin, I want to see delayed and uncollected laundry so that I can follow up.  
As an admin, I want to view the audit history for any order so that I can investigate issues.  
As an admin, I want to manage students, staff, and bags so that the system data stays accurate.

---

## 6. Core Features

### Feature 1 — Authentication and Role-Based Access
Purpose: Secure login with automatic routing to the correct dashboard.  
User Flow: User submits credentials → validated against Supabase Auth → profile role is read → user is routed to their role's dashboard.  
Acceptance Criteria:
- Public registration always assigns the `student` role.
- No user can set their own role via registration or profile update.
- Role-based routing is enforced server-side (RLS) not only in the UI.
- Expired sessions redirect to login.

Edge Cases:
- User attempts registration with a duplicate Registration ID or email → clear error.
- User with wrong role tries to access a protected page → redirected, not shown an error that leaks data.

### Feature 2 — Submit Laundry
Purpose: A student creates a new laundry order linked to their assigned bag.  
User Flow: Student taps Give Laundry → form shows assigned bag, auto-filled date/time, clothes count input, optional notes → submit → order created in Supabase with status SUBMITTED → confirmation shown.  
Acceptance Criteria:
- Clothes count must be within the admin-configured minimum (default 15) and maximum (default 25) — enforced server-side.
- Monthly submission limit (default 4 per student) enforced server-side; limit and counts read from `app_settings`.
- Duplicate submissions from repeated taps are prevented (button disabled during request, idempotency check).
- A student can only submit against their own assigned bag.
- A new order cannot be created for a bag that already has an active (non-PICKED_UP, non-CANCELLED) order.
- All three limits (monthly count, min clothes, max clothes) are admin-configurable in Settings — never hardcoded.

Edge Cases:
- Bag not yet assigned → explain the requirement and show a contact prompt.
- Student submits while offline → show a clear error, do not create a partial record.
- Student has reached monthly submission limit → show remaining count and reset date.
- Clothes count below minimum or above maximum → show the configured limits in the error message.

### Feature 3 — QR Scanning and Staff Status Updates
Purpose: Staff scan a bag QR to pull up its current order and advance its status.  
User Flow: Staff opens Scan Bag → camera activates → QR decoded → order details shown → single-tap action shown for next valid status → staff confirms → status updated and audited.  
Acceptance Criteria:
- QR decoding handles all valid bag QR tokens.
- Only the single next-valid action button is shown.
- Status transitions are validated server-side; client cannot skip a step.
- Every transition creates an audit log row.
- Manual search fallback is always accessible.

Edge Cases:
- Invalid or expired QR token → "Unrecognised bag" message, offer manual search.
- Camera permission denied → graceful message, jump straight to manual search.
- Device has no camera (desktop) → skip camera, show manual search.
- Order already in terminal status (PICKED_UP / CANCELLED) → show history, no action button.

### Feature 4 — In-App Notifications
Purpose: Students are alerted when their laundry is ready for collection.  
User Flow: Staff marks order as COMPLETED → database trigger or server-side logic creates a notification row → student's dashboard updates via Realtime → badge shown on notification icon.  
Acceptance Criteria:
- Notification is created exactly once per COMPLETED transition (idempotent).
- Notification contains order ID, bag ID, clothes count, and pickup instruction.
- Student can mark notifications as read.
- Unread count is shown in the navigation.

Edge Cases:
- Student has the app open when laundry completes → dashboard updates live without refresh.
- Student is offline → notification is waiting when they return.

### Feature 5 — Admin Dashboard and Delay Detection
Purpose: Admins see live operational metrics and identify delayed orders.  
User Flow: Admin views dashboard → sees counts for each status → clicks Delayed Laundry → sees all orders exceeding the configured completion threshold.  
Acceptance Criteria:
- All counts are database-backed, not hardcoded.
- Delay threshold is read from a settings table, not scattered in code.
- Delayed orders are those in SUBMITTED, RECEIVED, or PROCESSING status for longer than the threshold.
- Admin can search and filter the full orders list by student, status, date range.

---

## 7. Non-Goals (MVP)

The following are intentionally NOT part of the initial version:
- WhatsApp, email, SMS, or push notifications (in-app only for MVP).
- Image uploads for lost or damaged items.
- Mobile app (web-only MVP).
- Payment or subscription features.
- Multi-hostel / multi-institution support.
- Advanced analytics or charting beyond basic counts.
- Bulk import/export of student data.

---

## 8. MVP Scope

Must Have:
- Student registration, login, dashboard, laundry submission, status tracking, notifications, QR download, history.
- Staff login, dashboard, QR scanning, manual search, status updates (Received → Processing → Completed → Picked Up).
- Admin dashboard with live counts, student/staff/order/bag management, delay detection, audit log view.
- Supabase Auth, PostgreSQL schema, RLS, Realtime.
- Responsive design (320 px–1440+ px).
- Cloudflare Workers with Static Assets deployment.

Nice to Have:
- Email notification when laundry is completed.
- Printable QR tags.
- Staff mobile camera QR scanning (desktop fallback already required).

Future:
- WhatsApp / SMS notifications.
- Image upload for lost/damaged reporting.
- Multi-hostel support.
- Analytics dashboard with historical trends.

---

## 9. Success Metrics

Primary Metrics:
- Zero laundry orders lost or stuck in an ambiguous status.
- Staff can complete a status update from QR scan to confirmation in under 10 seconds.

Secondary Metrics:
- Student notification delivered within 30 seconds of staff marking COMPLETED.
- No unauthorised cross-student data exposure in any RLS test.

---

## 10. Constraints

Technical: Supabase free-tier connection limits; design schema and subscriptions accordingly.  
Business: University IT policy may restrict third-party services — Cloudinary is optional and must not block core workflow.  
Design: Must be usable on a staff member's phone in poor lighting; touch targets ≥ 44 px.  
Timeline: Phase 1 (docs) → Phase 2–4 (implementation) → Phase 5 (realtime) → Phase 6 (QA).

---

## 11. Assumptions

- Each student is assigned exactly one laundry bag at a time.
- Bags are physical bags with a printed QR tag; the QR is assigned by admin, not self-generated by the student.
- Admin and staff accounts are created by the admin out-of-band (not via public registration).
- The hostel operates a single laundry room; multi-location support is not required.
- Internet connectivity is available in the laundry room for staff scanning.
- Supabase free tier is acceptable for the development phase; production capacity to be confirmed.

---

## 12. Open Questions

- What is the expected peak concurrent user count? (Affects Supabase plan and Realtime subscription budget.)
- How many physical bags exist per hostel? (Affects bag assignment UI and seed data.)
- Can a student have more than one active order at a time? (Current assumption: no — one active order per bag.)
- Who creates the first admin account? (Assumed: direct Supabase Auth signup + manual `role` insert by a DBA.)
- Should cancelled orders be visible in the student's history? (Assumed: yes, with CANCELLED status label.)
- Is there a time limit for uncollected COMPLETED laundry before it is flagged differently? (Handled by configurable delay threshold.)
- Should staff be able to cancel an order, or only admins? (Assumed: admin only for now.)

---

## 13. Definition of Done

The feature/product is complete when:
- [ ] Requirements are implemented and match this PRD.
- [ ] Critical user flows (submit, scan, status update, notification, pickup) work end-to-end.
- [ ] RLS tests pass: no cross-student data leakage, no role escalation.
- [ ] Build succeeds with no TypeScript errors.
- [ ] Responsive layout verified at 375 px, 768 px, and 1280 px.
- [ ] Audit log records every status transition.
- [ ] README documents all setup steps.
