# Forms rework, per-user theme color, profile menu — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.
> Executed inline in-session by request. TDD where a unit test adds signal;
> browser-verify the visual pieces.

**Goal:** Every in-app modal form becomes wide + 2-column on desktop / tall +
1-column on mobile with a fixed frame and body-only scroll; the accent color
becomes a per-user pick from 10 presets stored on `profiles`; a profile menu in
the top bar exposes identity, the swatches, an edit-profile modal, and sign out.

**Architecture:** `Modal` gains a size + pinned header/footer + single scroll
region. New `src/shared/ui/form/*` primitives (grid-friendly `Field`/`Select`,
`FormGrid`, `FormActions`). Accent = one `accents.ts` TS constant driving both
the swatch UI and a JS applier that overrides two CSS custom properties
(`--color-neo-primary`, new `--color-neo-primary-2`); persisted in
`profiles.theme_color` (migration 0012, default `indigo` = today's colors);
first-paint flash avoided by a tiny inline script in `index.html` reading
`localStorage['onevo.accent']`. New `src/features/profile/*` for menu + modal +
mutations.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (`@theme` in `src/index.css`),
react-hook-form is available but current modals use `useState` — match the file
being edited. `@tanstack/react-query` v5, `framer-motion`, `lucide-react`,
`zod`, Supabase JS v2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-forms-and-theming-design.md`

## Global Constraints

- Colors always via `var(--color-neo-*)` or `neo-*` utilities — never new hex
  literals in components. The only hex literals live in
  `src/core/theme/accents.ts` and the `index.html` inline map.
- Do not modify auth pages (`src/features/auth/*`). They keep importing `Field`
  from `src/features/auth/authShared.tsx` — leave that export untouched.
- No git commits — the user manages git. "Checkpoint" = stop, report, leave
  changes in the working tree.
- After any schema change:
  `supabase gen types typescript --local > src/core/supabase/database.types.ts`
  (if the local Supabase stack isn't running, hand-edit the `profiles` block to
  add `theme_color: string` in Row and `theme_color?: string` in Insert/Update).
- `Modal`'s `size` prop defaults to `'sm'` so every existing caller is unchanged.
- Run `npm run test`, `npm run typecheck`, `npm run lint` green before final
  checkpoint. `npm run test:e2e` for the flows in Task 11.

---

### Task 1: Modal shell — size, pinned header/footer, body-only scroll

**Files:**
- Modify: `src/shared/ui/Modal.tsx`
- Test: `src/shared/ui/Modal.test.tsx`

**Interfaces:**
- Produces: `Modal` props become
  `{ open, onClose, title?, children, className?, size?: 'sm' | 'lg', footer?: ReactNode }`.
  `size` default `'sm'`. `sm` → `max-w-lg`; `lg` → `max-w-[920px]`.
  Body is the sole scroll region (`overflow-y-auto`); header + footer `shrink-0`.

- [ ] **Step 1: Write failing tests** in `Modal.test.tsx`:

```tsx
it('defaults to the small width', () => {
  render(<Modal open onClose={() => {}} title="T">body</Modal>)
  expect(screen.getByRole('dialog')).toHaveClass('max-w-lg')
})

it('applies the wide width for size="lg"', () => {
  render(<Modal open onClose={() => {}} title="T" size="lg">body</Modal>)
  expect(screen.getByRole('dialog')).toHaveClass('max-w-[920px]')
})

it('renders the footer in a pinned region and keeps body scrollable', () => {
  render(
    <Modal open onClose={() => {}} title="T" footer={<button>Save</button>}>
      <p>content</p>
    </Modal>,
  )
  const dialog = screen.getByRole('dialog')
  expect(dialog.querySelector('[data-modal-body]')).toHaveClass('overflow-y-auto')
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run** `npm run test -- src/shared/ui/Modal.test.tsx` → the two new
  assertions fail.

- [ ] **Step 3: Implement.** Replace the inner `motion.div` body of `Modal.tsx`:

```tsx
const width = size === 'lg' ? 'max-w-[920px]' : 'max-w-lg'
// ...
<motion.div
  role="dialog"
  aria-modal="true"
  aria-label={title}
  className={cn(
    'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[var(--radius-neo-large)] bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-floating)] md:max-h-[85vh]',
    width,
    className,
  )}
  initial={{ scale: 0.96, y: 8 }}
  animate={{ scale: 1, y: 0 }}
  exit={{ scale: 0.96, y: 8 }}
  onClick={(e) => e.stopPropagation()}
>
  {title && (
    <h2 className="shrink-0 px-6 pt-6 pb-4 text-lg font-bold text-[var(--color-neo-text-primary)]">
      {title}
    </h2>
  )}
  <div data-modal-body className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
    {children}
  </div>
  {footer && (
    <div className="shrink-0 border-t border-black/5 bg-[var(--color-neo-card)] px-6 py-4">
      {footer}
    </div>
  )}
</motion.div>
```

Keep `p-4` on the backdrop wrapper (gives the sheet breathing room on mobile).
Add `size` and `footer` to `ModalProps`; default `size = 'sm'`.

- [ ] **Step 4: Run** `npm run test -- src/shared/ui/Modal.test.tsx` → green.
- [ ] **Step 5: Run** `npm run typecheck` → green (no caller passes bad props;
  `footer`/`size` optional).
- [ ] **Step 6: Checkpoint.**

---

### Task 2: Form primitives — grid-friendly Field/Select, FormGrid, FormActions

**Files:**
- Create: `src/shared/ui/form/Field.tsx`
- Create: `src/shared/ui/form/Select.tsx`
- Create: `src/shared/ui/form/FormGrid.tsx`
- Create: `src/shared/ui/form/FormActions.tsx`
- Test: `src/shared/ui/form/FormGrid.test.tsx`

**Interfaces:**
- Produces:
  - `FormGrid({ children })` → `<div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">`.
  - `Field` — same visual input as `authShared`'s `Field` but **no bottom
    margin**; extra prop `full?: boolean` → wrapper gets `md:col-span-2`.
    Signature: `forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; error?: string; full?: boolean }>`.
  - `Select` — same, for `<select>`:
    `{ label: string; id: string; error?: string; full?: boolean; children }` +
    `SelectHTMLAttributes<HTMLSelectElement>`.
  - `FormActions({ children })` → `<div class="flex justify-end gap-3">` (goes in
    `Modal`'s `footer`).

- [ ] **Step 1: Write failing test** `FormGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { FormGrid } from './FormGrid'
import { Field } from './Field'

it('lays children on a 2-col md grid and spans full fields', () => {
  render(
    <FormGrid>
      <Field id="a" label="A" />
      <Field id="b" label="B" full />
    </FormGrid>,
  )
  expect(screen.getByLabelText('A').closest('[data-field]')).not.toHaveClass('md:col-span-2')
  expect(screen.getByLabelText('B').closest('[data-field]')).toHaveClass('md:col-span-2')
})
```

- [ ] **Step 2: Run** `npm run test -- src/shared/ui/form/FormGrid.test.tsx` →
  fails (modules missing).

- [ ] **Step 3: Implement the four files.**

`Field.tsx` (copy the input classes verbatim from
`src/features/auth/authShared.tsx` lines 39-47 so the look is identical):

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
  full?: boolean
}

export const Field = forwardRef<HTMLInputElement, Props>(
  ({ label, id, error, full, className, ...props }, ref) => (
    <div data-field className={cn(full && 'md:col-span-2')}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[var(--radius-neo-md)] bg-[var(--color-neo-bg)] px-3 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none transition focus:ring-2 focus:ring-[var(--color-neo-primary)]/40 focus:ring-offset-1 focus:ring-offset-[var(--color-neo-bg)]',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[var(--color-neo-danger)]">{error}</p>}
    </div>
  ),
)
Field.displayName = 'FormField'
```

`Select.tsx` — same wrapper/label, a `<select>` with the select classes used in
`BillFormModal.tsx:81` (`h-10 w-full rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] px-3 text-sm shadow-[var(--shadow-neo-pressed)]`), plus
`outline-none focus:ring-2 focus:ring-[var(--color-neo-primary)]/40`. `full` →
`md:col-span-2` on the `data-field` wrapper. Children = `<option>`s.

`FormGrid.tsx`:

```tsx
import type { ReactNode } from 'react'
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">{children}</div>
}
```

`FormActions.tsx`:

```tsx
import type { ReactNode } from 'react'
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-3">{children}</div>
}
```

- [ ] **Step 4: Run** `npm run test -- src/shared/ui/form/FormGrid.test.tsx` →
  green.
- [ ] **Step 5: Checkpoint.**

---

### Task 3: Accent palette + applier + CSS default + first-paint script

**Files:**
- Create: `src/core/theme/accents.ts`
- Create: `src/core/theme/applyAccent.ts`
- Test: `src/core/theme/accents.test.ts`
- Test: `src/core/theme/applyAccent.test.ts`
- Modify: `src/index.css` (add `--color-neo-primary-2` default)
- Modify: `index.html` (inline pre-paint script)

**Interfaces:**
- Produces:
  - `type AccentKey = 'indigo'|'violet'|'blue'|'teal'|'emerald'|'amber'|'rose'|'red'|'graphite'|'black'`
  - `interface Accent { key: AccentKey; label: string; base: string; companion: string }`
  - `const ACCENTS: Accent[]` (10, order per spec), `const ACCENT_KEYS: AccentKey[]`,
    `const DEFAULT_ACCENT: AccentKey = 'indigo'`
  - `function accentByKey(key: string | null | undefined): Accent` — returns the
    match or the `indigo` entry.
  - `function applyAccent(key: AccentKey): void` — sets
    `--color-neo-primary` = base and `--color-neo-primary-2` = companion on
    `document.documentElement.style`; writes `localStorage['onevo.accent'] = key`
    (wrapped in try/catch).
  - `const ACCENT_STORAGE_KEY = 'onevo.accent'`

- [ ] **Step 1: Write failing tests.**

`accents.test.ts`:

```ts
import { ACCENTS, ACCENT_KEYS, DEFAULT_ACCENT, accentByKey } from './accents'

it('has 10 accents including graphite and black', () => {
  expect(ACCENTS).toHaveLength(10)
  expect(ACCENT_KEYS).toEqual(expect.arrayContaining(['graphite', 'black']))
})

it('default maps to the current colors', () => {
  const d = accentByKey(DEFAULT_ACCENT)
  expect(d.base.toUpperCase()).toBe('#5A7BFF')
  expect(d.companion.toUpperCase()).toBe('#8B5CF6')
})

it('accentByKey falls back to indigo for junk', () => {
  expect(accentByKey('nope').key).toBe('indigo')
  expect(accentByKey(null).key).toBe('indigo')
})
```

`applyAccent.test.ts`:

```ts
import { applyAccent, ACCENT_STORAGE_KEY } from './applyAccent'

it('sets both custom properties and persists the key', () => {
  applyAccent('emerald')
  const root = document.documentElement
  expect(root.style.getPropertyValue('--color-neo-primary')).toBe('#059669')
  expect(root.style.getPropertyValue('--color-neo-primary-2')).toBe('#10B981')
  expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('emerald')
})
```

- [ ] **Step 2: Run** both → fail (missing modules).

- [ ] **Step 3: Implement** `accents.ts` (full `ACCENTS` array per spec §1) and
  `applyAccent.ts`:

```ts
import { accentByKey, type AccentKey } from './accents'

export const ACCENT_STORAGE_KEY = 'onevo.accent'

export function applyAccent(key: AccentKey): void {
  const a = accentByKey(key)
  const root = document.documentElement
  root.style.setProperty('--color-neo-primary', a.base)
  root.style.setProperty('--color-neo-primary-2', a.companion)
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, a.key)
  } catch {
    /* storage disabled — ignore */
  }
}
```

- [ ] **Step 4:** `src/index.css` — inside `@theme`, add under
  `--color-neo-primary`:

```css
  --color-neo-primary-2: #8B5CF6;
```

- [ ] **Step 5:** `index.html` — add just before `</head>` (keep the map in sync
  with `accents.ts` — cross-comment both):

```html
    <script>
      // Pre-paint accent — keep map in sync with src/core/theme/accents.ts
      (function () {
        try {
          var m = {
            indigo: ['#5A7BFF', '#8B5CF6'], violet: ['#7C3AED', '#A855F7'],
            blue: ['#2563EB', '#3B82F6'], teal: ['#0D9488', '#14B8A6'],
            emerald: ['#059669', '#10B981'], amber: ['#B45309', '#D97706'],
            rose: ['#E11D48', '#F43F5E'], red: ['#DC2626', '#EF4444'],
            graphite: ['#4B5563', '#6B7280'], black: ['#1F2937', '#374151']
          };
          var k = localStorage.getItem('onevo.accent');
          if (k && m[k]) {
            var r = document.documentElement.style;
            r.setProperty('--color-neo-primary', m[k][0]);
            r.setProperty('--color-neo-primary-2', m[k][1]);
          }
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 6: Run** `npm run test -- src/core/theme` → green.
- [ ] **Step 7: Checkpoint.**

---

### Task 4: Replace hard-coded `#8b5cf6` with `var(--color-neo-primary-2)`

**Files (Modify):**
- `src/components/navigation/Sidebar.tsx:16` — `to-[#8b5cf6]` → `to-[var(--color-neo-primary-2)]`
- `src/layouts/PortalLayout.tsx:13` — same
- `src/features/customers/components/CustomerCard.tsx:35` — `linear-gradient(135deg, var(--color-neo-primary), #8b5cf6)` → `..., var(--color-neo-primary-2))`
- `src/features/team/components/MemberList.tsx:44` — same
- `src/features/settings/components/OrderTypeList.tsx:37` — same
- `src/features/settings/components/WorkflowList.tsx:38` — same
- `src/features/settings/components/SettingsSectionMenu.tsx:28` — same

- [ ] **Step 1:** `grep -rn "#8b5cf6\|#8B5CF6" src` → expect exactly the 7 hits
  above.
- [ ] **Step 2:** Edit all 7. After: `grep -rn "8b5cf6" src` returns nothing.
- [ ] **Step 3: Run** `npm run test` (nothing should break) + `npm run lint`.
- [ ] **Step 4: Checkpoint.**

---

### Task 5: Migration 0012 + AuthProvider wiring + types

**Files:**
- Create: `supabase/migrations/0012_profile_theme_color.sql`
- Modify: `src/core/auth/auth.types.ts`
- Modify: `src/app/providers/AuthProvider.tsx`
- Modify: `src/core/supabase/database.types.ts` (regen or hand-edit `profiles`)
- Test: `src/app/providers/AuthProvider.test.tsx` (extend)

**Interfaces:**
- Produces:
  - `AppProfile` gains `themeColor: AccentKey`.
  - `AuthValue` gains `refreshProfile: () => Promise<void>` (re-runs
    `loadProfile` for the current session user, updates context `profile`).
  - `useAuth()` consumers can call `refreshProfile()` after writing
    `profiles.theme_color` / name / phone.

- [ ] **Step 1:** Write `0012_profile_theme_color.sql`:

```sql
alter table public.profiles
  add column theme_color text not null default 'indigo';

alter table public.profiles
  add constraint profiles_theme_color_check
  check (theme_color in
    ('indigo','violet','blue','teal','emerald','amber','rose','red','graphite','black'));
```

- [ ] **Step 2:** Apply locally if the stack runs
  (`supabase migration up` / `supabase db reset`), then
  `supabase gen types typescript --local > src/core/supabase/database.types.ts`.
  If not running: hand-edit the `profiles` block in `database.types.ts` —
  `Row` add `theme_color: string`, `Insert`/`Update` add `theme_color?: string`.

- [ ] **Step 3:** `auth.types.ts` — add `import type { AccentKey } from '@/core/theme/accents'`
  and `themeColor: AccentKey` to `AppProfile`.

- [ ] **Step 4:** `AuthProvider.tsx`:
  - `loadProfile` select → `'id, full_name, email, status, theme_color, user_types(key)'`
  - return object → add `themeColor: accentByKey(data.theme_color).key` (import
    `accentByKey`).
  - Add `refreshProfile`: pull the session-load logic into a
    `const hydrate = async (s: Session | null) => { setProfile(s ? await loadProfile(s.user.id) : null) }`
    helper; `refreshProfile = async () => { if (session) await hydrate(session) }`.
    Add to context value + `AuthValue` interface. Default context object gets
    `refreshProfile: async () => {}`.

- [ ] **Step 5:** Extend `AuthProvider.test.tsx` — the mocked `profiles` select
  now must return `theme_color`; assert `profile.themeColor` is set (e.g.
  `'indigo'` when the row has `theme_color: 'indigo'`). Update the existing
  supabase mock's returned row.

- [ ] **Step 6: Run** `npm run test -- src/app/providers/AuthProvider.test.tsx`
  + `npm run typecheck` → green.
- [ ] **Step 7: Checkpoint.**

---

### Task 6: ThemeProvider — apply accent from profile

**Files:**
- Create: `src/core/theme/ThemeProvider.tsx`
- Modify: `src/app/App.tsx` (mount under `AuthProvider`, above `ToastProvider`)
- Test: `src/core/theme/ThemeProvider.test.tsx`

**Interfaces:**
- Consumes: `useAuth().profile?.themeColor`, `applyAccent`.
- Produces: `<ThemeProvider>{children}</ThemeProvider>` — renders children, runs
  an effect: `useEffect(() => { if (profile?.themeColor) applyAccent(profile.themeColor) }, [profile?.themeColor])`.

- [ ] **Step 1: Write failing test** `ThemeProvider.test.tsx`: render
  `ThemeProvider` inside a mocked `AuthProvider` context whose `profile.themeColor`
  is `'teal'`; assert
  `document.documentElement.style.getPropertyValue('--color-neo-primary') === '#0D9488'`.
  (Mock `@/app/providers/AuthProvider` `useAuth`.)

- [ ] **Step 2: Run** → fails.

- [ ] **Step 3: Implement:**

```tsx
import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { applyAccent } from '@/core/theme/applyAccent'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  useEffect(() => {
    if (profile?.themeColor) applyAccent(profile.themeColor)
  }, [profile?.themeColor])
  return <>{children}</>
}
```

- [ ] **Step 4:** `App.tsx`:

```tsx
<AuthProvider>
  <ThemeProvider>
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  </ThemeProvider>
</AuthProvider>
```

- [ ] **Step 5: Run** `npm run test -- src/core/theme` + `npm run typecheck`.
- [ ] **Step 6: Checkpoint.**

---

### Task 7: Profile queries + mutations

**Files:**
- Create: `src/features/profile/queries/useOwnProfile.ts`
- Create: `src/features/profile/mutations/useUpdateOwnProfile.ts`
- Create: `src/features/profile/mutations/useUpdateAccent.ts`
- Create: `src/features/profile/mutations/useChangePassword.ts`
- Test: `src/features/profile/mutations/useUpdateAccent.test.ts`

**Interfaces:**
- Produces:
  - `useOwnProfile()` → `useQuery(['own-profile'], …)` selecting
    `full_name, phone, email` from `profiles` where `id = auth.uid()`; returns
    `{ fullName, phone, email }`.
  - `useUpdateOwnProfile()` → `useMutation` taking
    `{ fullName: string; phone: string | null }`, `update(profiles).eq('id', uid)`;
    on success invalidates `['own-profile']` and calls `refreshProfile()` from
    `useAuth()`.
  - `useUpdateAccent()` → `useMutation` taking `key: AccentKey`; calls
    `applyAccent(key)` immediately (optimistic), then
    `update(profiles).set({ theme_color: key }).eq('id', uid)`; on error re-apply
    the previous key + toast; on success `refreshProfile()`.
  - `useChangePassword()` → `useMutation` taking `password: string`; calls
    `supabase.auth.updateUser({ password })`.

  All read `uid` from `supabase.auth.getUser()` or the `useAuth().session`.
  Match existing mutation style in `src/features/*/mutations/*` (they use
  `useMutation` + `supabase` + throw on `error`).

- [ ] **Step 1: Write failing test** `useUpdateAccent.test.ts`: mock `supabase`
  and `applyAccent`; render the hook with a QueryClient wrapper; call
  `.mutateAsync('rose')`; assert `applyAccent` called with `'rose'` and the
  supabase `update` chain got `{ theme_color: 'rose' }`.

- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Implement the four files** following the interfaces + the
  repo's existing mutation pattern (see
  `src/features/customers/mutations/useCustomerMutations.ts` for the shape:
  `useMutation({ mutationFn, onSuccess })`, `queryClient.invalidateQueries`).
- [ ] **Step 4: Run** `npm run test -- src/features/profile` + `npm run typecheck`.
- [ ] **Step 5: Checkpoint.**

---

### Task 8: ProfileMenu + TopBar wiring

**Files:**
- Create: `src/features/profile/components/ProfileMenu.tsx`
- Modify: `src/components/navigation/TopBar.tsx`
- Test: `src/features/profile/components/ProfileMenu.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`profile`), `useUpdateAccent`, `authService.signOut`,
  `ACCENTS`, `applyAccent`.
- Produces: `<ProfileMenu />` — self-contained; no props. Renders a trigger
  button + a dropdown. Emits `onEditProfile` internally by rendering
  `<ProfileFormModal>` (Task 9) with local `open` state.

- [ ] **Step 1: Write failing tests** `ProfileMenu.test.tsx`:
  - renders initials from `profile.fullName` ("Kaja Atharan" → "KA").
  - opening the menu shows `email` and 10 swatch buttons
    (`getAllByRole('button', { name: /theme/i })` or `aria-label` per accent
    label → assert length 10).
  - clicking the `Emerald` swatch calls the mocked `useUpdateAccent` mutate with
    `'emerald'`.
  - "Sign out" calls `authService.signOut`.

- [ ] **Step 2: Run** → fails.

- [ ] **Step 3: Implement `ProfileMenu.tsx`:**
  - Trigger: `<button>` `h-9 w-9 rounded-full` with
    `bg-[var(--color-neo-primary)] text-white text-xs font-bold`, initials.
    `aria-haspopup="menu"` `aria-expanded={open}`.
  - Outside-click: a `useEffect` adding a `pointerdown` listener on `document`
    that closes when the target is outside a `ref`. Esc closes.
  - Dropdown: `absolute right-0 top-11 z-50 w-64 rounded-[var(--radius-neo-md)]
    bg-[var(--color-neo-card)] p-3 shadow-[var(--shadow-neo-floating)]`,
    wrapped in `AnimatePresence`/`motion.div` like `Modal`.
  - Identity row: initials avatar + `fullName` + `email`
    (`text-xs text-[var(--color-neo-text-secondary)]`).
  - Swatches: `grid grid-cols-5 gap-2`; each a `button` `h-8 w-8 rounded-full`
    with `style={{ background: a.base }}`, `aria-label={`${a.label} theme`}`,
    `aria-pressed={a.key === profile?.themeColor}`, active gets
    `ring-2 ring-offset-2 ring-[var(--color-neo-text-primary)]`. onClick →
    `updateAccent.mutate(a.key)` (the hook applies immediately).
  - "Edit profile" button → `setEditOpen(true)`.
  - hairline, then "Sign out" button (danger text) → `authService.signOut()`.
  - Render `{editOpen && <ProfileFormModal onClose={() => setEditOpen(false)} />}`.

- [ ] **Step 4:** `TopBar.tsx` — replace the sign-out `<button>` with
  `<ProfileMenu />`. Keep the `<header>` + title. Remove the now-unused
  `LogOut` import and `authService` import if nothing else uses them.

- [ ] **Step 5: Run** `npm run test -- src/features/profile/components/ProfileMenu.test.tsx`
  + `npm run typecheck` + `npm run lint`.
- [ ] **Step 6: Checkpoint.**

---

### Task 9: ProfileFormModal

**Files:**
- Create: `src/features/profile/components/ProfileFormModal.tsx`
- Test: `src/features/profile/components/ProfileFormModal.test.tsx`

**Interfaces:**
- Consumes: `Modal` (`size="lg"`, `footer`), `FormGrid`, `Field`, `FormActions`,
  `Button`, `useToast`, `useOwnProfile`, `useUpdateOwnProfile`,
  `useChangePassword`.
- Produces: `<ProfileFormModal onClose={() => void} />`.

- [ ] **Step 1: Write failing tests:**
  - renders Full name + Phone prefilled from a mocked `useOwnProfile`
    (`{ fullName: 'Kaja', phone: '123', email: 'k@x.com' }`); email input is
    `readOnly`.
  - Save calls `useUpdateOwnProfile` mutate with `{ fullName, phone }`.
  - password block: entering mismatched passwords disables / blocks "Update
    password"; entering `<8` chars blocks; matching ≥8 calls
    `useChangePassword` mutate.

- [ ] **Step 2: Run** → fails.

- [ ] **Step 3: Implement.** `useState` for `fullName`, `phone`, `pw`, `pw2`
  (match the `CustomerFormModal` style). Body:

```tsx
<Modal open onClose={onClose} title="Edit profile" size="lg"
  footer={
    <FormActions>
      <Button variant="ghost" onClick={onClose}>Close</Button>
      <Button variant="primary" disabled={!canSaveDetails || saving} onClick={saveDetails}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </FormActions>
  }>
  <FormGrid>
    <Field id="p-name" label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
    <Field id="p-phone" label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
    <Field id="p-email" label="Email" value={email} readOnly full />
  </FormGrid>
  <div className="mt-6 border-t border-black/5 pt-5">
    <h3 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Change password</h3>
    <FormGrid>
      <Field id="p-pw" label="New password" type="password" value={pw}
        onChange={e => setPw(e.target.value)}
        error={pw && pw.length < 8 ? 'At least 8 characters' : undefined} />
      <Field id="p-pw2" label="Confirm password" type="password" value={pw2}
        onChange={e => setPw2(e.target.value)}
        error={pw2 && pw2 !== pw ? 'Does not match' : undefined} />
    </FormGrid>
    <div className="mt-3 flex justify-end">
      <Button variant="default" disabled={!canChangePw || changingPw} onClick={changePw}>
        {changingPw ? 'Updating…' : 'Update password'}
      </Button>
    </div>
  </div>
</Modal>
```

`canSaveDetails = fullName.trim().length > 0`.
`canChangePw = pw.length >= 8 && pw === pw2`.
`saveDetails` → `await updateOwnProfile.mutateAsync({ fullName, phone: phone || null })`,
toast success/error. `changePw` → `await changePassword.mutateAsync(pw)`, on
success clear `pw`/`pw2` + toast, on error toast.

- [ ] **Step 4: Run** `npm run test -- src/features/profile/components/ProfileFormModal.test.tsx`
  + `npm run typecheck`.
- [ ] **Step 5: Checkpoint.**

---

### Task 10: Migrate the 6 modal forms to wide + grid + footer

Do these one file at a time; after each, run that file's test and fix queries.
Pattern per form: import `Modal` (already), add `size="lg"` (except keep short
ones `sm`), wrap fields in `FormGrid` with the new `Field`/`Select` from
`@/shared/ui/form/*`, move the action buttons into `Modal`'s `footer` via
`FormActions`, mark wide fields `full`.

**10a — `src/features/customers/components/CustomerFormModal.tsx`** (+ test)
- `size="lg"`. Swap `Field` import to `@/shared/ui/form/Field`.
- Grid order: Full name · Email · Phone · Company · Address (`full`) · City ·
  Temp password *(create only)* · Notes (`full`).
- Actions → `footer={<FormActions>…</FormActions>}`.
- Test: label queries already match; add
  `expect(screen.getByLabelText('Address (optional)').closest('[data-field]')).toHaveClass('md:col-span-2')`.

**10b — `src/features/bills/components/BillFormModal.tsx`** (+ test)
- Already `max-w-2xl` → change to `size="lg"` (drop the `className="max-w-2xl"`).
- Replace the hand-rolled `<select>` with `@/shared/ui/form/Select` (`full`).
- `FormGrid`: Customer (`full`) · Order date · Deadline · Notes (`full`).
- `BillRowsEditor` stays directly in the body **after** the grid (full width),
  not inside `FormGrid`.
- Actions → `footer`.
- Test: keep existing; assert customer select still labelled "Customer".

**10c — `src/features/bills/components/RecordPaymentModal.tsx`** (+ test if exists)
- Read the file. If ≥3 inputs → `size="lg"` + `FormGrid`; else leave `sm`, just
  move actions into `footer` + swap to new `Field`.

**10d — `src/features/settings/components/OrderTypeFormModal.tsx`** (+ test)
- Read; `size="lg"` if ≥3 fields; `FormGrid`; `Select` for the workflow picker;
  actions → `footer`.

**10e — `src/features/settings/components/WorkflowFormModal.tsx`** (+ test)
- Read; likely has a name + description + a `StageEditor`. `size="lg"`,
  name/description in `FormGrid` (`description` `full`), `StageEditor` full-width
  in the body after the grid, actions → `footer`.

**10f — `src/features/team/components/MemberFormModal.tsx`** (+ test)
- Read; `size="lg"` if ≥3 fields; `FormGrid`; actions → `footer`.

- [ ] **Step 1:** For each of 10a–10f: read the file, apply the pattern, run
  `npm run test -- <that test file>`, fix.
- [ ] **Step 2:** Full `npm run test` + `npm run typecheck` + `npm run lint` green.
- [ ] **Step 3: Checkpoint.**

---

### Task 11: End-to-end + browser verification

**Files:**
- Create/extend: `e2e/profile-theming.spec.ts`

- [ ] **Step 1:** e2e spec (follow the auth/login helper pattern already in
  `e2e/`):
  - log in → open ProfileMenu → click a non-default swatch (e.g. Rose) →
    assert `getComputedStyle(document.documentElement).getPropertyValue('--color-neo-primary')`
    is `#E11D48` → reload → still `#E11D48`.
  - open ProfileMenu → Edit profile → change Full name → Save → reload →
    ProfileMenu initials/name reflect the new value.
- [ ] **Step 2:** `npm run test:e2e -- profile-theming` → green.
- [ ] **Step 3:** Browser check via preview: start dev server, open a form
  (Customers → Add customer) at desktop width — confirm 2 columns, wide dialog,
  body scrolls with header/footer pinned; resize to mobile — confirm single
  column, tall sheet. Screenshot both. Open ProfileMenu, switch a couple of
  colors, confirm buttons/rings/avatars/gradients all recolor (including the
  sidebar logo).
- [ ] **Step 4:** Final: `npm run test && npm run typecheck && npm run lint`
  all green. Report.
- [ ] **Step 5: Checkpoint — done.**

---

## Self-Review

**Spec coverage:**
- Wide/2-col desktop, tall/1-col mobile, fixed frame, body-only scroll → Tasks 1, 2, 10 ✅
- Popup size fixed → Task 1 (`max-h` + `max-w-[920px]`) ✅
- 10 colors incl. gray + black → Task 3 (`ACCENTS`) ✅
- Default stays current ("purple"→changeable, no forced change) → Task 3
  `DEFAULT_ACCENT='indigo'` + Task 5 migration `default 'indigo'` ✅
- Per-user persistence → Task 5 migration 0012 + `theme_color` ✅
- Profile icon top-right of nav bar → Task 8 (`TopBar` + `ProfileMenu`) ✅
- Theme customization in every user's profile → Task 8 swatches + Task 9 modal ✅
- Edit profile (name/phone/password) → Tasks 7, 9 ✅
- The real "purple" (`#8b5cf6`) → Task 4 ✅
- FOUC on login → Task 3 `index.html` script + Task 6 applier ✅

**Placeholder scan:** 10c–10f say "read the file then apply the pattern" because
those files weren't opened during design — the pattern (size + FormGrid + Select
+ footer) and decision rule ("≥3 fields → lg") are concrete. Acceptable: the
transformation is identical to 10a/10b which have full code.

**Type consistency:** `AccentKey`, `Accent`, `ACCENTS`, `accentByKey`,
`applyAccent`, `ACCENT_STORAGE_KEY`, `refreshProfile`, `themeColor`,
`useUpdateAccent`/`useUpdateOwnProfile`/`useChangePassword`/`useOwnProfile`,
`FormGrid`/`Field`/`Select`/`FormActions`, `Modal` `size`/`footer` — used
consistently across tasks. ✅
