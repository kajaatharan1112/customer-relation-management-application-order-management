# Forms rework, per-user theme color, and profile menu — design

Date: 2026-09-04
Status: approved (user said proceed through full scope without step approval)

## Goal

Three connected pieces of UI work:

1. **Form rework** — every in-app modal form becomes wide + two-column on desktop,
   single-column + tall on mobile. The dialog frame is fixed size; only the form
   body scrolls. Header and footer stay pinned.
2. **Per-user theme color** — the accent color (today a hard-coded periwinkle
   `#5A7BFF` plus a purple `#8b5cf6` in gradients) becomes a per-user choice from
   10 presets, saved on the user's `profiles` row.
3. **Profile menu** — a profile icon in the top-right of the top bar opens a
   dropdown with the user's identity, the 10 color swatches, an "Edit profile"
   modal (name / phone / change password), and Sign out.

Out of scope: dark mode, auth pages (Login/Register/Forgot/Reset), the customer
portal, inline editors (`BillRowsEditor` internals, `StageEditor`), sidebar
layout.

## Background (current state)

- `src/shared/ui/Modal.tsx` — a single `max-w-lg` centered box. No max-height, no
  internal scroll region, no sticky header/footer. Long forms (Customer = 8
  fields) overflow the viewport with nothing to scroll.
- Forms are all single-column: `Field` (from `src/features/auth/authShared.tsx`)
  renders a `mb-4` block. Modals stack them directly.
- 6 modal forms in scope: `CustomerFormModal`, `BillFormModal`,
  `RecordPaymentModal`, `OrderTypeFormModal`, `WorkflowFormModal`,
  `MemberFormModal`. Delete/confirm dialogs stay small and untouched.
- Theme: `src/index.css` `@theme` block, static. `--color-neo-primary: #5A7BFF`.
  Used ~50 places as `var(--color-neo-primary)` / `neo-primary` utilities.
- A second color `#8b5cf6` (true purple) is hard-coded in 7 files as the
  gradient companion: `Sidebar.tsx:16`, `PortalLayout.tsx:13`,
  `CustomerCard.tsx:35`, `MemberList.tsx:44`, `OrderTypeList.tsx:37`,
  `WorkflowList.tsx:38`, `SettingsSectionMenu.tsx:28`.
- `profiles` table has `full_name`, `phone`, `email`. No preferences column.
- RLS `profiles_self_update` already allows `id = auth.uid()` for update
  (`using` + `with check`). Adding a column needs no policy change.
- `AuthProvider.loadProfile` selects explicit columns and maps to `AppProfile`.
- `TopBar` renders only a title + a bare sign-out icon button. No avatar exists
  anywhere (Sidebar top slot is the app logo, not a user avatar).
- `AppLayout`: `TopBar` (fixed, both breakpoints) + `Sidebar` (desktop only) +
  `MobileBottomBar` (mobile only).

## 1. Theme color system

### Tokens

Introduce a second custom property `--color-neo-primary-2` (gradient companion).
Replace all 7 `#8b5cf6` literals with `var(--color-neo-primary-2)`. After this,
two properties fully describe the accent.

`src/index.css` `@theme` keeps `--color-neo-primary: #5A7BFF` and adds
`--color-neo-primary-2: #8B5CF6` as the static defaults (used before JS runs and
as the SSR-less first paint baseline).

### Palette — single source of truth

`src/core/theme/accents.ts`:

```ts
export type AccentKey =
  | 'indigo' | 'violet' | 'blue' | 'teal' | 'emerald'
  | 'amber' | 'rose' | 'red' | 'graphite' | 'black'

export interface Accent { key: AccentKey; label: string; base: string; companion: string }

export const ACCENTS: Accent[] = [
  { key: 'indigo',   label: 'Indigo',   base: '#5A7BFF', companion: '#8B5CF6' }, // current / default
  { key: 'violet',   label: 'Violet',   base: '#7C3AED', companion: '#A855F7' },
  { key: 'blue',     label: 'Blue',     base: '#2563EB', companion: '#3B82F6' },
  { key: 'teal',     label: 'Teal',     base: '#0D9488', companion: '#14B8A6' },
  { key: 'emerald',  label: 'Emerald',  base: '#059669', companion: '#10B981' },
  { key: 'amber',    label: 'Amber',    base: '#B45309', companion: '#D97706' },
  { key: 'rose',     label: 'Rose',     base: '#E11D48', companion: '#F43F5E' },
  { key: 'red',      label: 'Red',      base: '#DC2626', companion: '#EF4444' },
  { key: 'graphite', label: 'Graphite', base: '#4B5563', companion: '#6B7280' },
  { key: 'black',    label: 'Black',    base: '#1F2937', companion: '#374151' },
]

export const DEFAULT_ACCENT: AccentKey = 'indigo'
export const ACCENT_KEYS = ACCENTS.map((a) => a.key)
export function accentByKey(key: string | null | undefined): Accent
```

All 10 bases take white text (button `primary` variant is `text-white`). `amber`
and `graphite` bases are chosen dark enough for ≥4.5:1 on white text; verify in
implementation and nudge darker if a check fails.

### Persistence — migration 0012

`supabase/migrations/0012_profile_theme_color.sql`:

```sql
alter table public.profiles
  add column theme_color text not null default 'indigo';

alter table public.profiles
  add constraint profiles_theme_color_check
  check (theme_color in ('indigo','violet','blue','teal','emerald','amber','rose','red','graphite','black'));
```

Default `'indigo'` maps to today's exact `#5A7BFF` / `#8B5CF6` → existing users
see no color change on deploy. Regenerate `src/core/supabase/database.types.ts`
if that file is hand-or-tool-maintained (check; it exists in repo).

### Data flow

- `AuthProvider.loadProfile` — add `theme_color` to the `.select(...)`. Map to
  `profile.themeColor: AccentKey` (via `accentByKey`). Extend `AppProfile` type
  in `src/core/auth/auth.types.ts`.
- `src/features/profile/mutations/useUpdateAccent.ts` — `useMutation` that writes
  `profiles.theme_color` for `auth.uid()`, optimistic. On success the applier
  picks up the new `profile.themeColor` (invalidate the auth profile load, or
  update context). Simplest: mutation updates DB + calls a context setter passed
  from `AuthProvider`, or `AuthProvider` re-runs `loadProfile`. Decide in plan —
  prefer a lightweight `refreshProfile()` exposed from `AuthProvider`.

### Applier + FOUC

- `src/core/theme/applyAccent.ts` — `applyAccent(key: AccentKey)`: sets
  `--color-neo-primary` and `--color-neo-primary-2` on
  `document.documentElement.style`, and writes `localStorage['onevo.accent'] = key`.
- **Pre-paint script** in `index.html` `<head>` (inline, tiny, no imports):
  reads `localStorage['onevo.accent']`, looks up a small inlined
  `{key: [base, companion]}` map, sets the two vars before first paint. Falls
  back to doing nothing (CSS defaults win) when absent/invalid. Keep the map in
  sync with `accents.ts` (comment on both sides pointing at each other).
- `src/core/theme/ThemeProvider.tsx` — mounts under `AuthProvider`. A
  `useApplyAccent()` effect watches `profile?.themeColor` and calls
  `applyAccent`. When `profile` is null (logged out) it leaves whatever the
  pre-paint script set.

## 2. Profile menu

### TopBar restructure

`src/components/navigation/TopBar.tsx` — keep the title on the left; replace the
bare sign-out button with `<ProfileMenu />` on the right. Same fixed header,
same offsets.

### `src/features/profile/components/ProfileMenu.tsx`

- Trigger: a round button, `h-9 w-9`, showing the user's initials (derived from
  `profile.fullName`, fallback to email initial), accent-tinted.
- Dropdown (click to open, click-outside + Esc to close, `role="menu"`):
  - Header row: initials avatar, `fullName`, `email` (muted, read-only).
  - "Theme color" section: a 5×2 grid of 10 swatch buttons
    (`aria-label={label}`, `aria-pressed` for the active one, ring on active).
    Click → `useUpdateAccent.mutate(key)` → optimistic apply immediately via
    `applyAccent` so the UI recolors before the network returns.
  - "Edit profile" button → opens `ProfileFormModal`.
  - Divider, then "Sign out" → `authService.signOut()`.
- Reuse `framer-motion` for the open/close like `Modal`. Portal not required;
  absolutely-positioned under the trigger, right-aligned.

### `src/features/profile/components/ProfileFormModal.tsx`

- Uses the new wide `Modal` (`size="lg"`) + `FormGrid`.
- Fields: Full name | Phone (row 1). Email shown read-only (full width).
- Change password block (full width): New password | Confirm password, plus a
  "Update password" action that calls `supabase.auth.updateUser({ password })`
  via `useChangePassword`. Min 8 chars, must match. This is independent of the
  name/phone save (separate button, separate toast).
- Name/phone save → `useUpdateOwnProfile` → writes `profiles.full_name`,
  `profiles.phone` for `auth.uid()`; on success `refreshProfile()` +
  success toast.
- The modal fetches the user's own `full_name` / `phone` on open (a small
  `useOwnProfile` query) — `AppProfile` doesn't carry `phone`.

### Mutations / queries (new)

- `src/features/profile/queries/useOwnProfile.ts`
- `src/features/profile/mutations/useUpdateOwnProfile.ts`
- `src/features/profile/mutations/useUpdateAccent.ts`
- `src/features/profile/mutations/useChangePassword.ts`

No RLS change (self-update already allowed).

## 3. Form layout rework

### `src/shared/ui/Modal.tsx`

- New prop `size?: 'sm' | 'lg'` (default `'sm'` — preserves every current
  caller). `sm` → `max-w-lg` (unchanged). `lg` → `max-w-[920px]`.
- New optional prop `footer?: ReactNode`.
- Structure becomes a flex column, capped height:
  - wrapper: `max-h-[85vh] md:max-h-[85vh]` desktop, `max-h-[92dvh]` mobile;
    `flex flex-col overflow-hidden`.
  - header: `shrink-0` — the `title` row (keep current styling).
  - body: `min-h-0 flex-1 overflow-y-auto` — wraps `children`. This is the only
    scroll region.
  - footer: `shrink-0` — renders `footer` when provided, with a top hairline /
    surface bg so it reads as pinned.
- Mobile: same component; the `max-h-[92dvh]` + `w-full` + outer `p-4` already
  yields a near-full-height sheet. Keep the centered position (not a bottom
  sheet) to minimize churn.
- Backdrop, portal, Esc, click-outside — unchanged.

### `src/shared/ui/form/FormGrid.tsx` + `FormRow`/`Field` behavior

- `FormGrid` — `grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2`.
- A field wrapper (`FormField` or a `full` prop on existing `Field`) that adds
  `md:col-span-2` when the control should span the whole width (notes, address,
  email-readonly, the Bill rows editor, the Bill customer select).
- `Field` in `authShared.tsx`: make the bottom margin conditional (drop `mb-4`
  when rendered inside a grid — simplest is a `dense` prop, or move `Field` to
  `src/shared/ui/form/` and have `FormGrid` children not rely on their own
  margins). Keep `authShared`'s `Field` export working for the auth pages
  (out of scope) — do not break them.
  - Decision for plan: add `src/shared/ui/form/Field.tsx` (grid-friendly, no
    own margin) and `src/shared/ui/form/Select.tsx`; keep `authShared` `Field`
    as-is for auth pages. Migrate the 6 modals to the new ones.
- `src/shared/ui/form/FormActions.tsx` — the Cancel / Save row, passed as
  `Modal`'s `footer`. `flex justify-end gap-3`.

### Per-form field layout

- **CustomerFormModal** (`size="lg"`): Full name | Email · Phone | Company ·
  Address *(full)* · City | Temp password *(create only)* · Notes *(full)*.
- **BillFormModal** (`size="lg"`): Customer *(full)* · Order date | Deadline ·
  Notes *(full)* · `BillRowsEditor` *(full)*.
- **RecordPaymentModal**: 2-col if ≥3 fields, else stays `sm`.
- **OrderTypeFormModal**, **WorkflowFormModal**, **MemberFormModal**: `size="lg"`
  + 2-col where they have ≥3 fields; keep 1-col for genuinely short ones.
- All 6: actions move into `Modal.footer` via `FormActions`.

### Confirm dialogs

`SettingsPage` delete modals, `PurgeConfirmModal`, etc. — leave as default
`size="sm"`, no footer prop (their buttons stay inline). No change.

## Testing

- `Modal.test.tsx` — body is the scroll region (`overflow-y-auto` present);
  `size="lg"` applies the wide max-width; `footer` renders in a pinned region;
  `size` defaults keep `max-w-lg`.
- 6 form modal tests — still pass via label queries; add an assertion that a
  known full-width field carries `md:col-span-2`; actions found in footer.
- New: `ProfileMenu.test.tsx` (renders identity, 10 swatches, active state,
  clicking a swatch fires the mutation + applies), `ProfileFormModal.test.tsx`
  (name/phone save, password mismatch blocks, password too short blocks),
  `applyAccent.test.ts` (sets both CSS vars + localStorage),
  `accents.test.ts` (10 keys, default maps to current hex, `accentByKey`
  fallback).
- Migration: add to whatever migration test/list the repo keeps (there are
  `*.test.ts` beside repositories; check for a migrations manifest).
- e2e (`e2e/`): pick a non-default accent in the profile menu → reload → still
  applied and persisted; open Edit profile, change name → persists after reload.

## Files touched (summary)

New:
- `supabase/migrations/0012_profile_theme_color.sql`
- `src/core/theme/accents.ts`, `applyAccent.ts`, `ThemeProvider.tsx` (+ tests)
- `src/features/profile/` — `components/ProfileMenu.tsx`,
  `components/ProfileFormModal.tsx`, `queries/useOwnProfile.ts`,
  `mutations/useUpdateOwnProfile.ts`, `mutations/useUpdateAccent.ts`,
  `mutations/useChangePassword.ts` (+ tests)
- `src/shared/ui/form/` — `Field.tsx`, `Select.tsx`, `FormGrid.tsx`,
  `FormActions.tsx` (+ tests)

Changed:
- `index.html` (pre-paint accent script)
- `src/index.css` (`--color-neo-primary-2` default)
- `src/app/providers/AuthProvider.tsx` (select `theme_color`, `refreshProfile`)
- `src/core/auth/auth.types.ts` (`themeColor`)
- `src/app/App.tsx` or wherever providers mount (add `ThemeProvider`)
- `src/components/navigation/TopBar.tsx` (ProfileMenu)
- `src/shared/ui/Modal.tsx` (size, footer, scroll shell)
- 7 files: replace `#8b5cf6` → `var(--color-neo-primary-2)`
- 6 modal forms: wide + grid + footer

## Risks / notes

- Tailwind v4 opacity modifiers on `var()` colors (`.../40`) already work in the
  codebase (`focus:ring-[var(--color-neo-primary)]/40`), so a single var swap
  covers tinted usages — no extra shade tokens needed.
- `refreshProfile` vs full re-query: pick the minimal one that keeps
  `AuthProvider` the single source of `profile`.
- Keep the `index.html` inlined color map and `accents.ts` in sync — cross
  comment. A mismatch only affects the first-paint cached color, self-heals on
  load, but still note it.
- Do not regress auth pages: they keep importing `Field` from `authShared`.
