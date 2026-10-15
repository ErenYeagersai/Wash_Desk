# Code Style & Conventions — UNi LaunDRY

## 1. General Principles

- Readable code over clever code. A future reader should understand it without comments.
- Keep functions focused: one function does one thing.
- Avoid abstractions that do not yet have at least three call sites.
- Reuse existing components; do not duplicate UI patterns.
- Prefer consistency over novelty: follow established patterns in this codebase.
- Do not change unrelated files in a PR.

---

## 2. Naming

| Item            | Convention          | Examples                                   |
|-----------------|---------------------|--------------------------------------------|
| Components      | PascalCase          | `OrderCard`, `StatusStepper`, `BagQRCode`  |
| Hooks           | camelCase, `use` prefix | `useAuth`, `useOrders`, `useQRScanner` |
| Service functions | camelCase         | `fetchActiveOrders`, `advanceOrderStatus`  |
| TypeScript types/interfaces | PascalCase | `LaundryOrder`, `UserProfile`, `AppRole` |
| Constants       | UPPER_SNAKE_CASE    | `VALID_TRANSITIONS`, `STATUS_LABELS`       |
| Variables       | camelCase           | `orderId`, `isLoading`, `clothesCount`     |
| Files (components) | PascalCase.tsx   | `OrderCard.tsx`, `StatusStepper.tsx`       |
| Files (hooks/services/utils) | camelCase.ts | `useOrders.ts`, `orders.ts`, `formatDate.ts` |
| Database fields | snake_case          | `student_id`, `clothes_count`              |
| Supabase table names | snake_case, plural | `laundry_orders`, `profiles`          |

---

## 3. Folder Structure Rules

- One component per file.
- Co-locate a component's types in the same file if they are not shared; move to `types/index.ts` when shared.
- Page-level components go in `pages/<role>/`; reusable components go in `components/`.
- Business logic (Supabase queries) belongs in `services/`, not in components or hooks directly.
- Hooks orchestrate services and local state; they should not contain Supabase client calls.
- `lib/supabase.ts` exports a single Supabase client instance.
- Do not create barrel files (`index.ts` re-exports) unless the folder has more than six exports — they obscure what is actually used.

---

## 4. Imports

- Absolute imports from `src/` using the `@/` alias (`@/components/ui/Button`).
- Import order: React → third-party → `@/components` → `@/hooks` → `@/services` → `@/types` → `@/utils` → relative.
- No default export from `services/` or `utils/` files; use named exports.
- Components use default exports.

---

## 5. Components

Components must:
- Accept clearly typed props (no `any`).
- Display a loading skeleton or spinner, not a blank area, while data loads.
- Display an error state with a retry option on data-fetch failure.
- Display a meaningful empty state (with a call to action where appropriate).
- Handle their own disabled/loading state for interactive elements.

Components must not:
- Call Supabase directly. Use a hook from `hooks/` that delegates to `services/`.
- Contain business logic (status transition validation, order ID generation). These live in `utils/` or `services/`.

---

## 6. TypeScript

- `strict: true` in `tsconfig.json`. No `any` (prefer `unknown` and narrow with type guards).
- Prefer `interface` for object shapes, `type` for unions and aliases.
- Use `as const` for fixed lookup objects (e.g., `STATUS_TRANSITIONS`).
- Supabase generated types: run `supabase gen types typescript` and import from `types/supabase.ts`. Do not manually duplicate table column types.

```typescript
// Good
const STATUS_LABELS = {
  SUBMITTED:  'Submitted',
  RECEIVED:   'Received',
  PROCESSING: 'Processing',
  COMPLETED:  'Completed',
  PICKED_UP:  'Picked Up',
  CANCELLED:  'Cancelled',
} as const;

type OrderStatus = keyof typeof STATUS_LABELS;
```

---

## 7. React Patterns

- Prefer functional components with hooks.
- Use `React.memo` only when a performance issue is confirmed, not preemptively.
- Use `useCallback` / `useMemo` only for expensive computations or reference stability requirements.
- Keep `useEffect` deps arrays accurate. Lint with `eslint-plugin-react-hooks`.
- Avoid prop drilling beyond two levels — lift to context or colocate.
- Form state: `react-hook-form` (consistent validation, minimal re-renders).
- Do not use class components.

---

## 8. Error Handling

Use: `try/catch` in service functions; propagate errors as values to hooks; hooks expose an `error` field alongside `data` and `isLoading`.

Pattern:
```typescript
// services/orders.ts
export async function fetchStudentOrders(studentId: string) {
  const { data, error } = await supabase
    .from('laundry_orders')
    .select('*')
    .eq('student_id', studentId);
  if (error) throw error;
  return data;
}

// hooks/useOrders.ts
const [orders, setOrders] = useState<LaundryOrder[]>([]);
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);
// ...
```

Do not:
- Silently swallow errors.
- Show raw Supabase error messages to users (map them to user-friendly strings).
- Use `alert()` for errors.

---

## 9. State Management

No global state library (Redux, Zustand) in the MVP. State is managed by:
- `AuthContext`: authenticated user, profile, role.
- Page-level `useState` / `useReducer` for local form and UI state.
- Hooks (`useOrders`, `useNotifications`, etc.) for server state.
- Supabase Realtime subscriptions inside hooks for live updates.

Add a global state library only if the complexity genuinely justifies it.

---

## 10. Formatting

Formatter: Prettier (default config, `printWidth: 100`).  
Linter: ESLint with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.  
Type Checking: `tsc --noEmit` (run in CI).  
Tailwind class order: enforced by `prettier-plugin-tailwindcss`.

Run before committing:
```
npm run lint
npm run typecheck
npm run build
```

---

## 11. Comments

Write a comment only when the **why** is non-obvious: a hidden constraint, a subtle invariant, or a workaround for a specific bug. Do not write comments that restate the code.

```typescript
// Good: explains a non-obvious constraint
// Supabase Realtime does not send the initial state, only changes.
// We fetch the current state on mount and subscribe to deltas.

// Bad: restates the code
// Fetch orders from Supabase
const { data } = await supabase.from('laundry_orders').select('*');
```

---

## 12. Do

- Follow the folder structure defined in ARCHITECTURE.md.
- Reuse `components/ui/` atoms (Button, Input, Badge, Skeleton) across all pages.
- Use the design system's colour tokens — do not hardcode hex values.
- Write meaningful commit messages: `feat: add QR scan fallback to manual search`.
- Keep PRs focused: one feature or bug fix per PR.

## 13. Don't

- Create duplicate utility functions.
- Put Supabase client calls in components.
- Hard-code status strings — use the `STATUS_LABELS` constant.
- Hard-code the delay threshold — read it from `app_settings`.
- Introduce a new dependency without a clear reason.
- Leave commented-out dead code in the repository.
