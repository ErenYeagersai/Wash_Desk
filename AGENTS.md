# AI Coding Agent Instructions — UNi LaunDRY

## 1. Project Context

Project: UNi LaunDRY  
Purpose: University hostel laundry management platform — students track laundry, staff scan bags and update status, admins manage the system.  
Primary Users: Students (submit and track), Laundry Staff (scan and update), Admin (manage and report).

---

## 2. Source of Truth

Before any significant implementation, read the relevant documents in `/docs/`.

| Question                          | Document                    |
|-----------------------------------|-----------------------------|
| What are we building?             | `docs/PRD.md`               |
| How should it look?               | `docs/DESIGN_SYSTEM.md`     |
| How should the system work?       | `docs/ARCHITECTURE.md`      |
| What data exists?                 | `docs/DATABASE.md`          |
| What must be protected?           | `docs/SECURITY.md`          |
| How should code be written?       | `docs/CODE_STYLE.md`        |
| How will we know it works?        | `docs/TESTING.md`           |
| What are the user journeys?       | `docs/UX_FLOWS.md`          |
| What are the API contracts?       | `docs/API.md`               |

Do not contradict these documents without first identifying and documenting the conflict.

---

## 3. Technology Constraints

- Frontend: React 18, TypeScript (`strict: true`), Vite, Tailwind CSS 3.
- Backend: Supabase only (Auth, PostgreSQL, Realtime, RLS). No separate API server in the MVP.
- Deployment: Cloudflare Workers with Static Assets (or Cloudflare Pages for static-only).
- QR: `qrcode` (generation) + `html5-qrcode` or `@zxing/library` (scanning).
- Cloudinary: optional, future only. Do not add it as a dependency of the core workflow.
- Do not introduce new infrastructure (Express, Next.js, Firebase, etc.) without prior review.
- Supabase service-role key must never appear in any `VITE_*` variable or client-side code.

---

## 4. General Rules

- Inspect existing code and migrations before modifying anything.
- Reuse components from `components/ui/` before creating new ones.
- Follow the design system colour tokens and typography — no hardcoded hex values.
- Follow the folder structure in ARCHITECTURE.md § 8.
- All Supabase queries go through `services/`; hooks consume services; components consume hooks.
- Status transitions must be enforced in the `advance_order_status` RPC, not only in the UI.
- Do not put business logic (transition validation, order ID generation) in React components.
- Do not expose sensitive data in QR codes, console logs, or error messages shown to users.
- Map Supabase errors to user-friendly strings before displaying them.
- Never claim a feature is complete unless it is implemented and tested.

---

## 5. Before Each Implementation Phase

1. Read the docs sections relevant to the feature.
2. Inspect existing files for reusable components, hooks, or services.
3. Identify the database tables and RLS policies affected.
4. Identify the Realtime subscriptions required.
5. Write a concise implementation plan; confirm if the scope is non-trivial.
6. Then implement.

---

## 6. Implementation Rules

- One feature or fix per PR / commit batch.
- Do not modify unrelated files.
- Write TypeScript with no `any`. Use Supabase-generated types from `types/supabase.ts`.
- Provide loading, empty, and error states for every data-fetching component.
- Disable submit buttons during async requests; re-enable on success or failure.
- Use `ON CONFLICT DO NOTHING` (or equivalent) in notification inserts to prevent duplicates.
- Read `delay_threshold_hours` from `app_settings` — do not hardcode `48`.
- Use the `STATUS_LABELS` constant and `is_valid_transition` helper, never inline status strings.
- Pagination: all list views default to 20 rows with load-more or page controls.
- Search: debounce at 300 ms before querying Supabase.

---

## 7. After Each Phase — Validation Checklist

1. `npm run typecheck` — no TypeScript errors.
2. `npm run lint` — no ESLint errors or warnings.
3. `npm run build` — production build succeeds.
4. `npm run test` — all Vitest tests pass.
5. Manually verify the phase's critical flows against `docs/UX_FLOWS.md`.
6. Confirm no cross-student data leakage (RLS smoke test).
7. Check responsive layout at 375 px, 768 px, 1280 px.

Fix failures before proceeding to the next phase.

---

## 8. Migration Rules

- Every schema change goes in a new numbered SQL file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
- Never edit a migration that has been applied — add a new one.
- Test migrations against a local Supabase instance before applying to production.
- Seed data (dev only) goes in `supabase/seed.sql`.

---

## 9. Security Rules (non-negotiable)

- RLS enabled on every table.
- `advance_order_status` RPC is the only way to change `laundry_orders.status`; direct client UPDATE of status is blocked by RLS.
- The `get_my_role()` helper is used by all role-based RLS policies.
- QR tokens encode only an opaque UUID; no personal data.
- Students cannot change their own `role` field (WITH CHECK clause blocks it).
- No `service_role` key in any file that reaches the browser.

---

## 10. Conflict Handling

If a requirement in a document conflicts with another document or with a practical constraint, do not silently pick one. Document the conflict, state both options and the tradeoff, and ask for a decision before implementing.

---

## 11. Completion Criteria

A phase is complete only when:
- All features in the phase are implemented and match the PRD.
- All validation checks in §7 pass.
- Security rules in §9 are satisfied.
- README is updated with any new setup steps.
- No TODOs or placeholder data remain in the submitted code.
