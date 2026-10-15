# UNi LaunDRY

University hostel laundry management system — React + Supabase + Cloudflare Workers.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Supabase account | free tier |
| Cloudflare account (deploy only) | free tier |

---

## Local Development

```bash
git clone <repo-url>
cd UNi_LaunDRY
npm install
cp .env.example .env        # fill in Supabase URL + anon key
npm run dev
```

App runs at `http://localhost:5173`.

---

## Supabase Setup

### 1 — Create a project

Go to https://supabase.com → New Project. Note the **Project URL** and **anon public key** from Settings → API.

### 2 — Disable email confirmation (dev / MVP)

In the Supabase Dashboard: **Authentication → Providers → Email** → turn off **Confirm email**.

> Before production launch: re-enable email confirmation and set up a transactional email provider (Settings → Auth → SMTP).

### 3 — Run the migration

In the Supabase Dashboard SQL Editor, paste and run:

```
supabase/migrations/20261015000001_initial_schema.sql
```

This creates all 6 tables, indexes, RLS policies, and the three RPCs (`submit_laundry_order`, `advance_order_status`, `mark_all_notifications_read`).

### 4 — Enable Realtime

Dashboard → **Database → Replication** → enable `laundry_orders` and `notifications`.

### 5 — (Optional) Load seed data

Only for local dev. The seed UUIDs are placeholders — you must first create the auth users manually in the Dashboard, then replace the UUIDs at the top of `supabase/seed.sql` before running it.

```
supabase/seed.sql
```

---

## Environment Variables

```
VITE_SUPABASE_URL=       # from Supabase Settings → API → Project URL
VITE_SUPABASE_ANON_KEY=  # from Supabase Settings → API → anon public
```

The service-role key must **never** appear in `VITE_*` variables — it would be exposed in the browser bundle.

---

## Creating the First Admin Account

There is intentionally no UI for this. Do it once after project setup:

**Step 1** — Invite the admin via Supabase Dashboard → Authentication → Invite user (or create directly with email confirmation disabled).

**Step 2** — In the SQL Editor, update the profile that `handle_new_user()` created:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE registration_id = 'ADMIN001';   -- replace with the actual registration ID
```

All subsequent staff/admin promotions are done the same way by the admin from the Settings page (coming in a future release) or via SQL.

---

## Configurable Limits

All submission limits live in `public.app_settings` and are never hardcoded:

| Key | Default | Meaning |
|-----|---------|---------|
| `monthly_bag_limit` | 4 | Max bag submissions per student per calendar month |
| `min_clothes` | 15 | Minimum clothes per submission |
| `max_clothes` | 25 | Maximum clothes per submission |
| `delay_threshold_hours` | 48 | Hours before an order is flagged as delayed |

Admins update these from the Settings page. The `submit_laundry_order` RPC reads them at runtime — no deploy needed.

---

## Build

```bash
npm run build   # output → dist/
```

TypeScript is checked by `tsc -b` before Vite bundles.

---

## Deploy to Cloudflare Workers (Static Assets)

```bash
npm run build
npx wrangler deploy
```

`wrangler.toml` is pre-configured with `[assets] directory = "./dist"` for Workers Static Assets. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your Cloudflare Worker's environment variables (not in the bundle).

Alternatively, deploy to **Cloudflare Pages**: connect the repo, set build command `npm run build`, output directory `dist`.

---

## Known Limitations (MVP)

- Staff QR-scan and order management pages are stubs — coming next.
- Admin dashboard (users, orders, audit logs, settings UI) is a stub.
- No email notifications — only in-app. Add Supabase Edge Functions + SMTP for email.
- No push notifications.
- Cloudinary image upload (optional future feature) is not wired up.
