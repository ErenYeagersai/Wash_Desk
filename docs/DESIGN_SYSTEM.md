# Design System — UNi LaunDRY

## 1. Design Direction

Style: Clean university SaaS — professional, trustworthy, and accessible. Not a generic admin template.  
Mood: Calm efficiency. Students should feel reassured; staff should feel productive.  
Design Principles:
- Clarity over decoration. Every element earns its place.
- Status must never depend on colour alone — use icons and labels alongside colour.
- Touch-first. Minimum 44 px tap targets. All critical actions reachable with one thumb.
- Consistency. Same component, same behaviour, every screen.

---

## 2. Brand

Brand Name: UNi LaunDRY  
Wordmark: "UNi" in regular weight, "LaunDRY" in bold. Avoid imagery of washing machines in the primary logo.  
Brand Voice: Direct, clear, and friendly. Avoid jargon. Example: "Your laundry is ready" not "COMPLETED status reached".

---

## 3. Color Palette

All values are CSS custom properties defined on `:root`. Redefine under `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]`.

```
--color-primary:        #1E3A5F   /* Deep university navy */
--color-primary-light:  #2E5299   /* Interactive hover state */
--color-secondary:      #F0A500   /* Warm amber accent */
--color-bg:             #F8F9FB   /* Page background */
--color-surface:        #FFFFFF   /* Card / panel surface */
--color-border:         #E2E8F0
--color-text:           #1A202C
--color-text-muted:     #718096
--color-success:        #2F855A
--color-success-bg:     #F0FFF4
--color-warning:        #D69E2E
--color-warning-bg:     #FFFBEB
--color-error:          #C53030
--color-error-bg:       #FFF5F5
--color-info:           #2B6CB0
--color-info-bg:        #EBF8FF
```

Dark mode overrides (swap surfaces, keep primary):
```
--color-bg:       #0F172A
--color-surface:  #1E293B
--color-border:   #334155
--color-text:     #F1F5F9
--color-text-muted: #94A3B8
```

### Status Colour Mapping
Each status uses colour + icon + text label — never colour alone.

| Status      | Colour token        | Icon (Lucide) |
|-------------|---------------------|---------------|
| SUBMITTED   | `--color-info`      | `Clock`       |
| RECEIVED    | `--color-primary`   | `CheckCircle` |
| PROCESSING  | `--color-warning`   | `Loader2`     |
| COMPLETED   | `--color-success`   | `Package`     |
| PICKED_UP   | `--color-text-muted`| `Home`        |
| CANCELLED   | `--color-error`     | `XCircle`     |

---

## 4. Typography

Font Family: Inter (Google Fonts), system-ui fallback.  
Heading Font: Inter (600 / 700 weight).  
Body Font: Inter (400 / 500 weight).

| Token   | Size   | Weight | Line Height |
|---------|--------|--------|-------------|
| h1      | 2rem   | 700    | 1.2         |
| h2      | 1.5rem | 700    | 1.3         |
| h3      | 1.25rem| 600    | 1.4         |
| h4      | 1.125rem| 600   | 1.4         |
| body    | 1rem   | 400    | 1.6         |
| small   | 0.875rem| 400   | 1.5         |
| label   | 0.75rem | 600   | 1.4         |

---

## 5. Spacing

Base unit: 4 px.  
Scale (Tailwind classes): 1 (4 px) / 2 (8 px) / 3 (12 px) / 4 (16 px) / 6 (24 px) / 8 (32 px) / 12 (48 px) / 16 (64 px) / 24 (96 px).

Layout gutters: 16 px on mobile, 24 px on tablet, 32 px on desktop.  
Section spacing: 32 px between major sections on mobile, 48 px on desktop.

---

## 6. Border Radius

| Token  | Value   | Usage                    |
|--------|---------|--------------------------|
| sm     | 4 px    | Tags, badges             |
| md     | 8 px    | Inputs, cards            |
| lg     | 12 px   | Modals, large panels     |
| xl     | 16 px   | Feature cards            |
| pill   | 9999 px | Status chips, buttons    |

---

## 7. Shadows

```
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)
shadow-lg:  0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)
```

Cards use `shadow-sm` at rest, `shadow-md` on hover.

---

## 8. Buttons

All buttons: min height 44 px, font-weight 600, rounded-md, transition 150 ms.

| Variant    | Background           | Text                | Border              |
|------------|----------------------|---------------------|---------------------|
| primary    | `--color-primary`    | white               | none                |
| secondary  | transparent          | `--color-primary`   | 1.5 px primary      |
| danger     | `--color-error`      | white               | none                |
| ghost      | transparent          | `--color-text`      | none                |
| disabled   | `--color-border`     | `--color-text-muted`| none, cursor:not-allowed |
| loading    | same as variant      | same, opacity 0.7   | spinner icon left   |

Touch target must be ≥ 44 px. On mobile, full-width for primary actions.

---

## 9. Inputs

All inputs: min height 44 px, border 1.5 px `--color-border`, rounded-md, transition 150 ms.

| State    | Border colour          | Box shadow                     |
|----------|------------------------|--------------------------------|
| default  | `--color-border`       | none                           |
| focus    | `--color-primary`      | 0 0 0 3px primary/20%          |
| error    | `--color-error`        | 0 0 0 3px error/20%            |
| disabled | `--color-border`       | none, bg `--color-bg`          |

Error message appears below the input in `--color-error`, font-size small.  
Placeholder: `--color-text-muted`.

---

## 10. Cards

Padding: 16 px (mobile), 24 px (desktop).  
Background: `--color-surface`.  
Border: 1 px `--color-border`.  
Border radius: rounded-lg (12 px).  
Shadow: shadow-sm at rest.

Status cards (student dashboard) show a left border 3 px in the status colour.

---

## 11. Navigation

### Top Bar (all roles)
Height: 56 px (mobile), 64 px (desktop).  
Background: `--color-surface` with bottom border.  
Contents: Logo left, notification bell + avatar/menu right.  
Notification badge: `--color-error` background, white text, pill shape.

### Sidebar (tablet/desktop, staff and admin)
Width: 240 px.  
Background: `--color-primary`.  
Text: white / white/70 for inactive items.  
Active item: white/15 bg, white text, left border 3 px `--color-secondary`.

### Bottom Nav (mobile, student)
Height: 56 px + safe-area-inset.  
Five icons: Dashboard, Submit, Status, History, Notifications.  
Active icon: `--color-primary`, label shown.  
Inactive: `--color-text-muted`.

---

## 12. States

Loading: Skeleton shimmer (bg `--color-border` animated), not blank screens. Spinners for inline actions (button loading state).  
Empty: Illustration (simple SVG) + headline + supporting text + primary action button.  
Error: Red banner at top of affected section, icon + message, retry button where applicable.  
Success: Green toast notification, auto-dismiss 4 s, manually dismissable.  
Disabled: Opacity 0.5, cursor `not-allowed`. Never hide disabled elements — grey them out with a tooltip explaining why.

---

## 13. Icons

Icon Library: Lucide React (consistent stroke-width 1.5).  
Default Size: 20 px inline, 24 px in navigation, 16 px in badges.  
Icon Style: Outline (Lucide default).  
Icons always paired with a visible label or `aria-label` attribute.

---

## 14. Responsive Design

Breakpoints (Tailwind defaults):
- Mobile: < 640 px
- Tablet (sm): 640–1023 px
- Desktop (lg): 1024–1279 px
- Wide (xl): 1280 px+

Mobile rules:
- Single-column layout.
- Bottom navigation bar.
- Full-width primary buttons.
- No horizontal scroll on any page width ≥ 320 px.
- Touch targets ≥ 44 px.

Tablet rules:
- Two-column cards on dashboard.
- Sidebar shown as collapsible drawer.

Desktop rules:
- Fixed sidebar (240 px), main content uses remaining width.
- Dashboard stats in 3–4 column grid.
- Tables replace card lists where data density is appropriate.

---

## 15. Progress Indicator (Laundry Status)

Horizontal stepper component, 5 steps.  
Completed step: filled circle, `--color-success`, checkmark icon.  
Current step: filled circle, `--color-primary`, animated pulse.  
Pending step: outline circle, `--color-border`.  
Connector line: filled for completed segments, dashed for pending.  
Labels below each step, hidden on very small screens (show only current step label).

---

## 16. Accessibility

- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<button>`, `<form>`, `<label>` — no div-soup.
- All interactive elements keyboard-reachable (Tab order, focus ring visible: 2 px offset ring using `--color-primary`).
- Colour contrast: text/bg ratio ≥ 4.5:1 (WCAG AA). Status chips use icon + text, never colour alone.
- ARIA: `aria-label` on icon-only buttons, `aria-live="polite"` on notification count, `role="status"` on loading indicators.
- Form inputs: every `<input>` has an associated `<label>` (visible or `sr-only`).
- Error messages: linked to inputs via `aria-describedby`.
