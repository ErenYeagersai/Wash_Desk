# Database — UNi LaunDRY

## 1. Database Engine

Database: PostgreSQL 15 (Supabase-managed)  
Hosting: Supabase (development: free tier; production: Pro tier TBC)

---

## 2. Naming Conventions

Tables: `snake_case`, plural (e.g., `laundry_orders`).  
Columns: `snake_case` (e.g., `student_id`, `clothes_count`).  
Primary Keys: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`.  
Foreign Keys: `<referenced_table_singular>_id` (e.g., `student_id`, `bag_id`).  
Timestamps: `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`. An `updated_at` trigger fires on every UPDATE.  
Enums: uppercase strings stored as `TEXT` with a CHECK constraint (not PostgreSQL ENUM type, for migration flexibility).  
Boolean flags: `is_<name>` prefix (e.g., `is_read`, `is_active`).

---

## 3. Tables

### `profiles`
Extends `auth.users`. Created automatically on user sign-up via a database trigger.

| Column          | Type        | Constraints                                  |
|-----------------|-------------|----------------------------------------------|
| id              | UUID        | PK, FK → auth.users(id) ON DELETE CASCADE    |
| registration_id | TEXT        | UNIQUE, NOT NULL                             |
| name            | TEXT        | NOT NULL                                     |
| hostel          | TEXT        | NOT NULL                                     |
| room_number     | TEXT        | NOT NULL                                     |
| phone           | TEXT        | NOT NULL                                     |
| role            | TEXT        | NOT NULL, CHECK IN ('student','staff','admin'), DEFAULT 'student' |
| created_at      | TIMESTAMPTZ | DEFAULT now()                                |
| updated_at      | TIMESTAMPTZ | DEFAULT now()                                |

Notes:
- Email is read from `auth.users.email`; not duplicated here.
- `role` cannot be updated by the user themselves (RLS blocks it).
- Trigger: `on_auth_user_created` inserts a `profiles` row with `role = 'student'` when a new `auth.users` row is created via public registration. Admin-created users have their role set manually or via a seed script.

### `laundry_bags`
One row per physical laundry bag.

| Column     | Type        | Constraints                                              |
|------------|-------------|----------------------------------------------------------|
| id         | UUID        | PK DEFAULT gen_random_uuid()                             |
| bag_id     | TEXT        | UNIQUE, NOT NULL (e.g., 'LND-1045')                      |
| student_id | UUID        | FK → profiles(id) ON DELETE SET NULL, NULLABLE           |
| qr_token   | UUID        | UNIQUE, NOT NULL, DEFAULT gen_random_uuid()              |
| is_active  | BOOLEAN     | NOT NULL DEFAULT true                                    |
| created_at | TIMESTAMPTZ | DEFAULT now()                                            |
| updated_at | TIMESTAMPTZ | DEFAULT now()                                            |

Notes:
- `qr_token` is the value encoded in the QR code — opaque UUID, not `bag_id`.
- `student_id` is nullable to allow bag reassignment. A bag must not be reassigned while an active order exists.
- Constraint: only one `is_active = true` bag per `student_id` (partial unique index).

### `laundry_orders`
One row per laundry submission.

| Column        | Type        | Constraints                                               |
|---------------|-------------|-----------------------------------------------------------|
| id            | UUID        | PK DEFAULT gen_random_uuid()                              |
| order_id      | TEXT        | UNIQUE, NOT NULL (e.g., 'ORD-20261015-00125')             |
| student_id    | UUID        | FK → profiles(id) ON DELETE RESTRICT, NOT NULL            |
| bag_id        | UUID        | FK → laundry_bags(id) ON DELETE RESTRICT, NOT NULL        |
| clothes_count | INTEGER     | NOT NULL, CHECK > 0                                       |
| notes         | TEXT        | NULLABLE                                                  |
| status        | TEXT        | NOT NULL, DEFAULT 'SUBMITTED', CHECK IN (see §5)          |
| submitted_at  | TIMESTAMPTZ | NOT NULL DEFAULT now()                                    |
| received_at   | TIMESTAMPTZ | NULLABLE                                                  |
| processing_at | TIMESTAMPTZ | NULLABLE                                                  |
| completed_at  | TIMESTAMPTZ | NULLABLE                                                  |
| picked_up_at  | TIMESTAMPTZ | NULLABLE                                                  |
| created_at    | TIMESTAMPTZ | DEFAULT now()                                             |
| updated_at    | TIMESTAMPTZ | DEFAULT now()                                             |

Notes:
- `order_id` format: `ORD-YYYYMMDD-NNNNN` (date + zero-padded sequence, generated in the application layer or a DB function).
- Partial unique index: only one active order per bag at a time (see §7).

### `notifications`
In-app notifications sent to students.

| Column           | Type        | Constraints                                                    |
|------------------|-------------|----------------------------------------------------------------|
| id               | UUID        | PK DEFAULT gen_random_uuid()                                   |
| student_id       | UUID        | FK → profiles(id) ON DELETE CASCADE, NOT NULL                  |
| laundry_order_id | UUID        | FK → laundry_orders(id) ON DELETE CASCADE, NOT NULL            |
| title            | TEXT        | NOT NULL                                                       |
| message          | TEXT        | NOT NULL                                                       |
| type             | TEXT        | NOT NULL DEFAULT 'LAUNDRY_COMPLETED'                           |
| is_read          | BOOLEAN     | NOT NULL DEFAULT false                                         |
| created_at       | TIMESTAMPTZ | DEFAULT now()                                                  |

Unique constraint: `(laundry_order_id, type)` — ensures exactly one notification per order per event type (idempotent).

### `audit_logs`
Immutable record of every status change.

| Column           | Type        | Constraints                                              |
|------------------|-------------|----------------------------------------------------------|
| id               | UUID        | PK DEFAULT gen_random_uuid()                             |
| user_id          | UUID        | FK → profiles(id) ON DELETE SET NULL, NOT NULL at write  |
| laundry_order_id | UUID        | FK → laundry_orders(id) ON DELETE RESTRICT, NOT NULL     |
| action           | TEXT        | NOT NULL (e.g., 'STATUS_CHANGED')                        |
| old_status       | TEXT        | NULLABLE                                                 |
| new_status       | TEXT        | NOT NULL                                                 |
| created_at       | TIMESTAMPTZ | DEFAULT now()                                            |

Notes:
- No `updated_at` — audit rows are immutable.
- `user_id` is the staff/admin who performed the action, not the student.
- RLS: staff and admin can insert; no one can update or delete.

### `submit_laundry_order` RPC
A `SECURITY DEFINER` PostgreSQL function called instead of a direct INSERT on `laundry_orders`. It:
1. Verifies the bag belongs to the calling student and is active.
2. Reads `monthly_bag_limit`, `min_clothes`, `max_clothes` from `app_settings`.
3. Rejects if the student's current-month order count ≥ `monthly_bag_limit`.
4. Rejects if `clothes_count` is outside `[min_clothes, max_clothes]`.
5. Rejects if an active order already exists for the bag.
6. Generates the `order_id` (`ORD-YYYYMMDD-NNNNN`) and inserts the order.

### `app_settings`
Configurable system settings, editable by admins only.

| Column     | Type        | Constraints                    |
|------------|-------------|--------------------------------|
| key        | TEXT        | PK                             |
| value      | TEXT        | NOT NULL                       |
| updated_at | TIMESTAMPTZ | DEFAULT now()                  |
| updated_by | UUID        | FK → profiles(id) ON DELETE SET NULL |

Seed rows (all admin-configurable):
```
('delay_threshold_hours', '48')   -- hours before an active order is flagged as delayed
('monthly_bag_limit',    '4')     -- max submissions per student per calendar month
('min_clothes',          '15')    -- minimum clothes count per submission
('max_clothes',          '25')    -- maximum clothes count per submission
```

---

## 4. Relationships

```
auth.users (1) ──── (1) profiles
profiles   (1) ──── (0..1) laundry_bags      [student_id on bag]
profiles   (1) ──── (0..N) laundry_orders    [student_id on order]
laundry_bags (1) ── (0..N) laundry_orders    [bag_id on order]
laundry_orders (1) ─ (0..N) notifications
laundry_orders (1) ─ (0..N) audit_logs
profiles (1) ──── (0..N) audit_logs          [user_id = acting staff/admin]
```

---

## 5. Status Constraints

Valid values for `laundry_orders.status`:
```sql
CHECK (status IN ('SUBMITTED','RECEIVED','PROCESSING','COMPLETED','PICKED_UP','CANCELLED'))
```

Valid forward transitions (enforced in `advance_order_status` RPC):
```
SUBMITTED  → RECEIVED
RECEIVED   → PROCESSING
PROCESSING → COMPLETED
COMPLETED  → PICKED_UP
Any status → CANCELLED  (admin only; see RLS)
```

No backward transitions are permitted.

---

## 6. Indexes

| Index                                      | Table           | Columns                    | Reason                              |
|--------------------------------------------|-----------------|----------------------------|-------------------------------------|
| `idx_profiles_registration_id`             | profiles        | registration_id            | Staff search by reg ID              |
| `idx_profiles_role`                        | profiles        | role                       | Admin filter by role                |
| `idx_laundry_bags_student_id`              | laundry_bags    | student_id                 | Student bag lookup                  |
| `idx_laundry_bags_qr_token`                | laundry_bags    | qr_token                   | Staff QR scan lookup                |
| `idx_laundry_orders_student_id`            | laundry_orders  | student_id                 | Student history                     |
| `idx_laundry_orders_bag_id`                | laundry_orders  | bag_id                     | Bag order history                   |
| `idx_laundry_orders_status`                | laundry_orders  | status                     | Staff active list, admin delay scan |
| `idx_laundry_orders_submitted_at`          | laundry_orders  | submitted_at DESC          | Date-range queries, delay detection |
| `idx_notifications_student_id`             | notifications   | student_id, is_read        | Student unread count                |
| `idx_audit_logs_order_id`                  | audit_logs      | laundry_order_id           | Order audit history                 |

Partial unique index — one active order per bag:
```sql
CREATE UNIQUE INDEX uq_bag_active_order
  ON laundry_orders (bag_id)
  WHERE status NOT IN ('PICKED_UP', 'CANCELLED');
```

Partial unique index — one active bag per student:
```sql
CREATE UNIQUE INDEX uq_student_active_bag
  ON laundry_bags (student_id)
  WHERE is_active = true;
```

---

## 7. Data Validation

- `clothes_count > 0`: enforced by CHECK constraint.
- `registration_id`: unique, non-null, format validated at the application layer (e.g., alphanumeric, 5–15 chars). No DB regex constraint — format may vary across years.
- `phone`: validated in the application layer (10 digits minimum).
- `status` transitions: validated in `advance_order_status` RPC; raw UPDATE of status by a client is blocked by RLS.
- `bag_id` format (e.g., `LND-XXXX`): application layer only; DB stores as TEXT.

---

## 8. Soft Delete

Students and staff accounts: No soft delete in MVP. Deletion cascades or sets null per FK definitions.  
Laundry orders: No delete after creation (preserve history). CANCELLED status is used instead.  
Audit logs: Never deleted.

---

## 9. Auditing

Every call to `advance_order_status` inserts an `audit_logs` row atomically (inside the same transaction). Fields captured: `user_id`, `laundry_order_id`, `action = 'STATUS_CHANGED'`, `old_status`, `new_status`, `created_at`.

Profile role changes: Logged separately via an `app_settings` audit if admin changes a role. (Future: dedicated `role_change_logs` table.)

---

## 10. Sensitive Data

| Field              | Table     | Protection                                  |
|--------------------|-----------|---------------------------------------------|
| email              | auth.users| Not duplicated; read from Supabase Auth only |
| phone              | profiles  | RLS: visible to owner and admin only         |
| room_number        | profiles  | RLS: visible to owner, staff (read), admin   |
| qr_token           | laundry_bags | Opaque UUID; bag lookup requires valid JWT |

No passwords are stored in application tables. Supabase Auth handles password hashing.

---

## 11. Migration Rules

1. Every schema change has a numbered SQL migration file in `supabase/migrations/`.
2. Migrations are applied via `supabase db push` or the Supabase dashboard.
3. Migrations must be backwards-compatible where possible; breaking changes need a plan.
4. Never modify a production migration file after it has been applied — add a new migration.
5. Seed data (development only) lives in `supabase/seed.sql`.

---

## 12. Seed Data (Development Only)

Three students, three staff accounts, and one admin. Student accounts are created via Supabase Auth; profile rows are inserted manually in `seed.sql`.

```
Student 1:  registration_id=23CSE1045, name=Venkatesh, hostel=Block A, room=101
Student 2:  registration_id=23CSE1046, name=Rahul,     hostel=Block A, room=102
Student 3:  registration_id=23CSE1047, name=Priya,     hostel=Block B, room=201

Bags:  LND-1045 → 23CSE1045, LND-1046 → 23CSE1046, LND-1047 → 23CSE1047

Sample orders:
  - ORD-20261015-00001: 23CSE1045, LND-1045, 12 clothes, status=PROCESSING
  - ORD-20261015-00002: 23CSE1046, LND-1046, 8 clothes, status=COMPLETED
  - ORD-20261015-00003: 23CSE1047, LND-1047, 5 clothes, status=SUBMITTED

Staff: 2 accounts with role='staff', created by the admin.
Admin: 1 account, created directly in Supabase Auth + manual profiles row with role='admin'.
```

See README for steps to create the first admin account securely.

---

## 13. RLS Policy Summary (cross-reference with SECURITY.md)

| Table           | Student                                      | Staff                                         | Admin        |
|-----------------|----------------------------------------------|-----------------------------------------------|--------------|
| profiles        | SELECT own row; UPDATE own non-role fields   | SELECT any (read-only)                        | All          |
| laundry_bags    | SELECT own bag                               | SELECT all; no INSERT/UPDATE from client      | All          |
| laundry_orders  | SELECT own; INSERT own; no status UPDATE     | SELECT all; UPDATE via RPC only               | All          |
| notifications   | SELECT own; UPDATE is_read own               | No access                                     | All          |
| audit_logs      | No access                                    | SELECT only                                   | All          |
| app_settings    | No access                                    | SELECT only                                   | All          |
