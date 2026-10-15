# Architecture — UNi LaunDRY

## 1. System Overview

UNi LaunDRY is a browser-based single-page application backed entirely by Supabase (Auth, PostgreSQL, Realtime, RLS). The React/Vite frontend communicates directly with Supabase via the public `anon` key; all access control is enforced through Row Level Security policies and database-side constraints. There is no separate custom API server in the MVP — Supabase provides auth, database, and real-time subscriptions.

The built static assets are deployed to Cloudflare Workers with Static Assets (or Cloudflare Pages as an equivalent alternative for a static frontend). A Cloudflare Worker is added only if a server-side endpoint is genuinely needed (e.g., signed Cloudinary upload parameters in a future release).

---

## 2. Architecture Pattern

Pattern: Serverless / BaaS (Backend-as-a-Service)  
Reason: Supabase eliminates the need for a custom API server, drastically reducing operational complexity for a university hostel context. Auth, database, Realtime, and RLS are all provided. The tradeoff is accepting Supabase's connection limits and pricing model; this is documented as a known constraint and acceptable at the expected scale.

---

## 3. Technology Stack

| Layer          | Technology                        | Notes                                          |
|----------------|-----------------------------------|------------------------------------------------|
| Frontend       | React 18, TypeScript, Vite        | SPA, `src/` structure                          |
| Styling        | Tailwind CSS 3                    | Utility-first, custom tokens via CSS variables |
| Backend/DB     | Supabase (PostgreSQL 15)          | Auth, DB, Realtime, RLS, Storage               |
| Auth           | Supabase Auth                     | Email/password; JWT; role stored in `profiles` |
| Realtime       | Supabase Realtime                 | Postgres changes on `laundry_orders`, `notifications` |
| QR Generation  | `qrcode` npm package              | Browser-side; encodes opaque bag token         |
| QR Scanning    | `html5-qrcode` or `@zxing/library`| Camera-based, desktop fallback to manual search|
| Deployment     | Cloudflare Workers + Static Assets| Static build artifact served by Cloudflare     |
| Secrets        | Cloudflare environment secrets    | `SUPABASE_URL`, `SUPABASE_ANON_KEY` at build   |
| Image hosting  | Not in MVP                        | Cloudinary optional, future only               |
| Analytics      | None (MVP)                        | Future                                         |

---

## 4. System Components

### Frontend (React SPA)
Responsibilities:
- Render all three role dashboards (student, staff, admin).
- Manage auth state via `AuthContext` wrapping `supabase.auth`.
- QR generation (student bag view) and QR scanning (staff scanner page).
- Subscribe to Supabase Realtime for live order status and notification updates.
- Route-guard every page: redirect if unauthenticated or wrong role.

### Supabase (Backend)
Responsibilities:
- Authenticate users; issue and verify JWTs.
- Store and enforce the data schema via PostgreSQL.
- Enforce row-level security — the primary security boundary.
- Broadcast row changes to subscribed clients via Realtime.
- Run database-level constraints (valid status transitions, unique indexes).

### Cloudflare Workers / Pages (Hosting)
Responsibilities:
- Serve static assets (JS, CSS, HTML, images) globally from the CDN.
- Redirect all paths to `index.html` for SPA routing (configured in `_redirects` or `wrangler.toml`).
- No custom Worker code in MVP; add only if a server-side endpoint is required later.

---

## 5. Architecture Diagram

```
[Browser]
    │  HTTPS
    ▼
[Cloudflare CDN]  ── serves ──  React SPA (static assets)
    │
    │  Supabase JS client (anon key, JWT from Auth)
    ▼
[Supabase]
    ├── Auth Service (JWT issuance, session management)
    ├── PostgreSQL (RLS enforced on every query)
    └── Realtime (Postgres changes → WebSocket → browser)
```

No custom API server. All data access goes through the Supabase client.

---

## 6. Data Flow — Submit Laundry

1. Student fills the Submit Laundry form.
2. Frontend validates: clothes_count positive integer, bag assigned, no active order on bag.
3. `supabase.from('laundry_orders').insert(...)` is called with the student's JWT.
4. RLS policy verifies: `auth.uid() = student_id` on the insert.
5. Database constraint verifies: no existing active order for this bag (partial unique index).
6. Order is created with `status = 'SUBMITTED'`, `submitted_at = now()`.
7. Supabase returns the new row; frontend shows confirmation.
8. (Realtime) The new row is broadcast; student dashboard auto-updates.

---

## 7. Data Flow — Staff Status Update

1. Staff scans QR or searches for order.
2. Frontend calls `supabase.from('laundry_orders').select(...)` with staff JWT.
3. RLS permits staff to read active orders (scoped to operational fields).
4. Correct next-action button is shown client-side (defensive: server also checks).
5. Staff taps action. Frontend calls a Supabase RPC (PostgreSQL function) `advance_order_status(order_id, new_status)`.
6. RPC validates the transition (`old_status → new_status` must be a valid step).
7. RPC updates `laundry_orders`, writes timestamps, inserts into `audit_logs`.
8. If `new_status = 'COMPLETED'`, RPC also inserts a `notifications` row for the student (idempotent via unique constraint on `laundry_order_id` + `type`).
9. Realtime broadcasts the order change to the student's subscription.
10. Student dashboard updates live; notification badge increments.

---

## 8. Project Structure

```
UNi_LaunDRY/
├── docs/                     # Architecture and design docs (this folder)
├── supabase/
│   └── migrations/           # Numbered SQL migration files
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Atoms: Button, Input, Badge, Skeleton, etc.
│   │   ├── layout/           # Sidebar, TopBar, BottomNav, PageShell
│   │   ├── laundry/          # StatusStepper, OrderCard, BagQR, QRScanner
│   │   └── notifications/    # NotificationList, NotificationBadge
│   ├── pages/
│   │   ├── auth/             # Landing, Login, Register
│   │   ├── student/          # Dashboard, SubmitLaundry, CurrentLaundry,
│   │   │                     #   OrderDetail, History, Notifications,
│   │   │                     #   Profile, MyBagQR
│   │   ├── staff/            # StaffDashboard, QRScanner, SearchLaundry,
│   │   │                     #   OrderDetail, ActiveLaundry, CompletedLaundry
│   │   └── admin/            # AdminDashboard, Students, Orders, Bags,
│   │                         #   Staff, DelayedLaundry, Reports, Settings
│   ├── layouts/              # StudentLayout, StaffLayout, AdminLayout, AuthLayout
│   ├── hooks/                # useAuth, useOrders, useNotifications, useRealtime,
│   │                         #   useQRScanner, useDebounce
│   ├── services/             # orders.ts, notifications.ts, bags.ts, profiles.ts
│   │                         #   (Supabase query wrappers)
│   ├── lib/
│   │   └── supabase.ts       # Supabase client singleton
│   ├── types/
│   │   └── index.ts          # Shared TypeScript interfaces (Order, Profile, Bag, etc.)
│   ├── utils/                # formatDate, generateOrderId, statusHelpers, etc.
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state, user profile, role
│   └── styles/
│       └── globals.css       # CSS custom properties, Tailwind base layer
├── public/                   # Static assets (favicon, etc.)
├── .env.example
├── wrangler.toml             # Cloudflare Workers config (or _redirects for Pages)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 9. Dependency Rules

- `pages/` components may import from `components/`, `hooks/`, `services/`, `utils/`, `types/`, `contexts/`.
- `components/` must not import from `pages/` or `services/` (only `hooks/` and `utils/`).
- `services/` imports only from `lib/supabase.ts` and `types/`.
- `hooks/` imports from `services/`, `lib/`, `types/`, `contexts/`.
- No component reads from `supabase` directly — all data access goes through `services/` or `hooks/`.

---

## 10. Authentication Architecture

- Supabase Auth stores credentials and issues a JWT containing `sub` (UUID = `auth.users.id`).
- On auth state change, the frontend reads the corresponding `profiles` row to get `role`, `registration_id`, `name`.
- Role is stored in `profiles.role` (not in the JWT claim, to avoid stale claims after role changes).
- RLS policies use `auth.uid()` to match `profiles.id` and check `profiles.role` via a helper function.
- Frontend reads role from `AuthContext` for routing; backend ignores the frontend's routing and enforces RLS independently.

---

## 11. Realtime Architecture

Subscriptions are created on mount and torn down on unmount:

| Page                    | Table subscribed       | Filter                         |
|-------------------------|------------------------|--------------------------------|
| Student Dashboard       | `laundry_orders`       | `student_id = auth.uid()`      |
| Student Notifications   | `notifications`        | `student_id = auth.uid()`      |
| Staff Dashboard         | `laundry_orders`       | `status IN (SUBMITTED, …)`     |
| Admin Dashboard         | `laundry_orders`       | none (all, admin role only)    |

RLS ensures that even if a client subscribes without a filter, it only receives rows it is authorised to read. Apply client-side filters too for performance.

---

## 12. QR Code Architecture

- Each `laundry_bags` row has a `qr_token` column: a UUID generated at bag creation time (never the student's personal data).
- QR code content: `{"token": "<uuid>"}` — opaque, non-sensitive.
- On scan, the app calls `supabase.from('laundry_bags').select(...).eq('qr_token', token)` with a staff JWT.
- RLS permits staff to read any `laundry_bags` row (bag lookup is operational, not personal data).
- Possession of a QR token does not bypass auth — the Supabase JWT is still required.

---

## 13. Key Technical Decisions

**Decision:** Use Supabase RPC (`advance_order_status`) for status transitions rather than a direct UPDATE.  
Context: Direct UPDATE from the client allows the client to set any status. A server-side function enforces the valid transition matrix and creates the audit row atomically.  
Alternatives: Direct UPDATE with RLS check; edge function.  
Reason: RPC is simpler than an edge function and keeps the transition logic in one place.

**Decision:** Status transitions are validated in the PostgreSQL function, not only in the React UI.  
Context: Hidden UI elements are not a security boundary.  
Reason: Defence in depth. The client shows only the valid next action, but the server rejects invalid transitions regardless.

**Decision:** Notifications are created inside the `advance_order_status` RPC (atomic with the status update).  
Context: Creating the notification in a separate client call would risk partial failures.  
Reason: Atomicity. One transaction updates the order, writes the audit row, and inserts the notification.

**Decision:** No custom API server in the MVP.  
Context: Supabase provides auth, database, and realtime. A custom Express/Hono server would duplicate this.  
Reason: Reduce infrastructure. Revisit if a server-side endpoint is genuinely needed (e.g., Cloudinary signing).

---

## 14. Performance Considerations

- Debounce search inputs (300 ms) before querying Supabase.
- Paginate all list views (20 rows default, load more on scroll or pagination controls).
- Index all high-cardinality filter columns (student_id, bag_id, status, submitted_at).
- Limit Realtime subscriptions: tear down on page unmount; avoid subscribing to tables the current role cannot fully use.
- Use `select('id, order_id, status, submitted_at')` projections instead of `select('*')` where full rows are not needed.

---

## 15. Failure Scenarios

| Scenario                        | Expected Behaviour                                                     |
|---------------------------------|------------------------------------------------------------------------|
| Supabase connection fails       | Show error state with retry button; no blank screen                    |
| Status transition rejected by RPC | Show specific error message; do not advance UI state                |
| QR scan decodes an unknown token | Show "Unrecognised bag" message; offer manual search                  |
| Camera permission denied        | Skip camera, show manual search immediately                            |
| Duplicate submission click      | Button disabled during request; second click is a no-op               |
| Expired JWT                     | Supabase client auto-refreshes; if refresh fails, redirect to login    |
| Realtime disconnects            | Supabase client reconnects automatically; show a subtle "reconnecting" indicator |
