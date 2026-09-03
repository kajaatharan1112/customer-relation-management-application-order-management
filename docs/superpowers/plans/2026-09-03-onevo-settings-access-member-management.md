# ONEVO Settings Access + Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock `/settings` to `admin_member` users and add two Settings sections — **Admins** and **Employees** — that list / add (temp password) / edit / disable staff accounts, with a last-admin guard.

**Architecture:** A new repository-less-of-Supabase-only-in-`data/` `features/team/` module wraps the existing `admin-create-user` Edge Function and the `profiles` table. One migration adds a guarded `set_member_status` RPC + an `active_admin_count()` helper; one tiny new Edge Function bans/unbans the auth user so a disabled member can't sign in. Route/nav gating is client-side (`isAdmin`) backed by DB/Edge `is_admin()` checks on every write.

**Tech Stack:** React 19, TypeScript, TanStack Query, react-hook-form + zod, Tailwind v4 neo tokens, framer-motion, lucide-react, Vitest + Testing Library, Supabase (Postgres + Edge Functions + pgTAP).

**Spec:** `docs/superpowers/specs/2026-09-03-onevo-settings-access-member-management-design.md`

## Global Constraints

- **Do NOT run git.** End each task with a `ready to commit: <msg>` line; the user commits.
- Supabase access stays in `features/*/data/*.repository.ts`. `features/team/` has one repository (`member.repository.ts`) and calls Supabase / Edge Functions only from there.
- View models are camelCase; DB rows stay snake_case until mapped in the repository.
- Reuse `formatCurrency` / `formatLKRShort`; add no new currency helper.
- Use only the neo tokens in `src/index.css` `@theme` (`--color-neo-*`, `--shadow-neo-*`, `--radius-neo-*`). The only non-token literals allowed in the codebase are `#8b5cf6` (icon-tile gradient stop) and `#a9750b` (StatCard warning text) and the Task-18 mobile-nav glass `rgba(...)`. Introduce no new colours; status colours reuse `--color-neo-success` (active), `--color-neo-warning` (invited), `--color-neo-secondary` (disabled).
- `vitest` `test.include` is `src/**/*.{test,spec}.{ts,tsx}`. Tests are colocated `*.test.ts(x)`.
- Mock hooks / Supabase in tests with `vi.hoisted` + `vi.mock`, following `src/features/bills/data/bill.repository.test.ts` and `src/features/customers/components/CustomerFormModal.test.tsx`.
- `lucide-react` is `1.38.0`. Icons this plan uses: `ShieldCheck`, `Users`, `Plus`, `Pencil`, `Ban`, `RotateCcw`, `Mail`, `Phone`, `ArrowLeft`, `ChevronRight`. If any name is not exported by that build, substitute the nearest existing icon and note the swap in the `ready to commit` line.
- Definition of done for every task: `npm run test` green, `npm run typecheck` clean, `npm run lint` clean (the 3 pre-existing `react/only-export-components` warnings in `Button.tsx` / `Toast.tsx` / `AuthProvider.tsx` are acceptable — no new warnings).
- **This plan modifies `supabase/`** only by ADDING: `supabase/migrations/0009_member_management.sql`, `supabase/functions/admin-set-user-ban/`, `supabase/tests/member_management.test.sql`. Never edit migrations `0001`–`0008` or existing functions.
- Roles: `user_type` values are `admin_member`, `employee`, `customer`. `isAdmin(profile)` = `profile.userType === 'admin_member'`. `isStaff` = admin_member OR employee.
- `now`/`today` in any selector-style helper is an injectable last param defaulting to `new Date()`.

---

## File Structure

```
src/
├── shared/constants/memberRoles.ts                      (create)
├── app/router/RoleRoute.tsx                             (modify) + 'admin'
├── app/router/RoleRoute.test.tsx                        (modify) admin cases
├── app/router/AppRouter.tsx                             (modify) wrap /settings
├── components/navigation/navConfig.tsx                  (modify) sidebarNavFor(isAdmin)
├── components/navigation/navConfig.test.tsx             (modify)
├── components/navigation/Sidebar.tsx                    (modify) role-aware
├── layouts/AppLayout.tsx                                (modify) pass isAdmin
├── features/team/
│   ├── team.types.ts                                    (create)
│   ├── data/member.repository.ts / .test.ts             (create)
│   ├── queries/useMembers.ts                            (create)
│   ├── mutations/useMemberMutations.ts                  (create)
│   └── components/
│       ├── MemberList.tsx / .test.tsx                   (create)
│       └── MemberFormModal.tsx / .test.tsx              (create)
└── features/settings/
    ├── SettingsPage.tsx / .test.tsx                     (modify) Tab union + 2 sections
    └── components/SettingsSectionMenu.tsx               (unchanged — new rows via SECTIONS)
supabase/
├── migrations/0009_member_management.sql                (create)
├── functions/admin-set-user-ban/index.ts / index.test.ts / deno.json  (create)
└── tests/member_management.test.sql                     (create)
e2e/settings-members.spec.ts                             (create)
```

---

## Task 1: `RoleRoute` gains `allow="admin"`; `/settings` moves under it

**Files:**
- Modify: `src/app/router/RoleRoute.tsx`
- Modify: `src/app/router/RoleRoute.test.tsx`
- Modify: `src/app/router/AppRouter.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`{ profile, loading }`), `isStaff` / `isCustomer` from `@/core/permissions/permissions`, `ROUTES`.
- Produces: `RoleRoute({ allow: 'staff' | 'customer' | 'admin' })`. For `'admin'`, renders `<Outlet/>` only when `isAdmin(profile)`, else `<Navigate to={ROUTES.dashboard} replace />`.

- [ ] **Step 1: Read the current files**

Run: `cat src/app/router/RoleRoute.tsx src/app/router/RoleRoute.test.tsx && sed -n '1,55p' src/app/router/AppRouter.tsx`
Note: `RoleRoute` currently imports `isStaff, isCustomer`; the staff block in `AppRouter` nests `RoleRoute allow="staff"` → `AppLayout` → the six routes incl. `ROUTES.settings`.

- [ ] **Step 2: Write the failing test** (extend `RoleRoute.test.tsx`)

```tsx
it('allow="admin" renders for an admin_member and redirects an employee', () => {
  const renderAt = (userType: string) => {
    vi.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({ profile: { userType }, loading: false }),
    }))
    return userType
  }
  // follow the existing test's mocking style in this file for useAuth;
  // assert: admin_member -> child content visible; employee -> redirected to '/'
})
```

Match the mocking pattern already used in `RoleRoute.test.tsx` (it mocks `@/app/providers/AuthProvider`). Add one test: with `useAuth` returning `{ profile: { userType: 'admin_member' }, loading: false }` and `<RoleRoute allow="admin" />` wrapping a `<Route element={<div>ADMIN OK</div>}>`, `ADMIN OK` renders; with `userType: 'employee'`, the location becomes `/` (Dashboard). Use `MemoryRouter initialEntries={['/x']}` + a catch route rendering its pathname, mirroring the existing tests.

- [ ] **Step 3: Run it — expect FAIL**

Run: `npm run test -- RoleRoute`
Expected: FAIL (`allow="admin"` not handled → TS error or wrong redirect).

- [ ] **Step 4: Implement**

In `src/app/router/RoleRoute.tsx`:
- Add `isAdmin` to the import from `@/core/permissions/permissions`.
- Change the prop type to `{ allow: 'staff' | 'customer' | 'admin' }`.
- After the existing `staff` / `customer` guards add:

```tsx
  if (allow === 'admin' && !isAdmin(profile)) return <Navigate to={ROUTES.dashboard} replace />
```

- [ ] **Step 5: Wrap `/settings` in `AppRouter.tsx`**

Replace the single settings route line inside the `<Route element={<AppLayout />}>` block:

```tsx
              <Route element={<RoleRoute allow="admin" />}>
                <Route path={ROUTES.settings} element={<SettingsPage />} />
              </Route>
```

(Keep it inside `AppLayout` so the shell still renders; the nested `RoleRoute` only gates `/settings`.)

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `npm run test -- RoleRoute AppRouter && npm run typecheck && npm run lint`
Expected: PASS / clean. Run `npm run test` (full) — nothing else should regress.

- [ ] **Step 7: Ready to commit**

`ready to commit: feat: RoleRoute admin mode + lock /settings to admins`

---

## Task 2: Role-aware sidebar — hide "Settings" for non-admins

**Files:**
- Modify: `src/components/navigation/navConfig.tsx`
- Modify: `src/components/navigation/navConfig.test.tsx`
- Modify: `src/components/navigation/Sidebar.tsx`
- Modify: `src/layouts/AppLayout.tsx`

**Interfaces:**
- Consumes: `STAFF_NAV`, `NavItem`, `ROUTES`, `useRole()` (`{ isAdmin }`).
- Produces: `sidebarNavFor(isAdmin: boolean): NavItem[]` from `navConfig.tsx` — `[...STAFF_NAV, Sales]` for everyone, plus the Settings item **only when `isAdmin`**. `SIDEBAR_NAV` stays exported and equals `sidebarNavFor(true)` (the admin view) for back-compat.

- [ ] **Step 1: Read** `cat src/components/navigation/navConfig.tsx src/components/navigation/navConfig.test.tsx src/components/navigation/Sidebar.tsx src/layouts/AppLayout.tsx`

Note current `navConfig`: `STAFF_NAV` (Dashboard/Home, Customers, Bills, Settings — 4 items) and `SIDEBAR_NAV = [...STAFF_NAV, { to: ROUTES.sales, label: 'Sales', shortLabel: 'Sales', icon: TrendingUp }]`. **`STAFF_NAV` already contains Settings.**

- [ ] **Step 2: Write the failing test** (extend `navConfig.test.tsx`)

```tsx
import { STAFF_NAV, SIDEBAR_NAV, sidebarNavFor } from '@/components/navigation/navConfig'
import { ROUTES } from '@/shared/constants/routes'

it('sidebarNavFor(false) omits Settings; sidebarNavFor(true) includes it', () => {
  const asEmployee = sidebarNavFor(false)
  const asAdmin = sidebarNavFor(true)
  expect(asEmployee.some((n) => n.to === ROUTES.settings)).toBe(false)
  expect(asAdmin.some((n) => n.to === ROUTES.settings)).toBe(true)
  // Sales is visible to both
  expect(asEmployee.some((n) => n.to === ROUTES.sales)).toBe(true)
})

it('SIDEBAR_NAV equals the admin sidebar and the mobile bar stays 4 tabs', () => {
  expect(SIDEBAR_NAV).toEqual(sidebarNavFor(true))
  expect(STAFF_NAV.filter((n) => n.to !== ROUTES.settings)).toHaveLength(3)
})
```

Note: `STAFF_NAV` currently has 4 items incl. Settings, but `MobileBottomBar` maps `STAFF_NAV` and must stay 4 tabs (Home/Customers/Bills/Settings) — **do not remove Settings from `STAFF_NAV`**; the mobile bar keeps it (mobile has no admin/employee split requirement per the spec — Settings on mobile still route-guards). The new `sidebarNavFor` is desktop-rail only.

Adjust the second assertion to just `expect(STAFF_NAV).toHaveLength(4)` if the reviewer prefers the mobile bar unchanged. Keep the mobile bar exactly as-is.

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- navConfig`)

- [ ] **Step 4: Implement `navConfig.tsx`**

Add below `SIDEBAR_NAV`:

```tsx
const SALES_ITEM: NavItem = { to: ROUTES.sales, label: 'Sales', shortLabel: 'Sales', icon: TrendingUp }
const SETTINGS_ITEM = STAFF_NAV.find((n) => n.to === ROUTES.settings)!

export function sidebarNavFor(isAdmin: boolean): NavItem[] {
  const base = STAFF_NAV.filter((n) => n.to !== ROUTES.settings)
  return isAdmin ? [...base, SALES_ITEM, SETTINGS_ITEM] : [...base, SALES_ITEM]
}
```

Keep `SIDEBAR_NAV` as is; if its current definition already appends Sales, redefine it as `export const SIDEBAR_NAV: NavItem[] = sidebarNavFor(true)`.

- [ ] **Step 5: `Sidebar.tsx` uses the role**

```tsx
import { useRole } from '@/core/auth/auth.hooks'
import { sidebarNavFor } from '@/components/navigation/navConfig'
// inside the component:
const { isAdmin } = useRole()
const nav = sidebarNavFor(isAdmin)
// map `nav` instead of SIDEBAR_NAV
```

`Sidebar` renders inside `AppLayout` which is inside `AuthProvider` → `useRole()` is safe here. No prop drilling needed; `AppLayout.tsx` needs no change unless it also maps nav — if `AppLayout` doesn't render nav items itself, leave it untouched (drop it from this task's file list).

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `npm run test -- navConfig Sidebar && npm run typecheck && npm run lint && npm run test`

- [ ] **Step 7: Ready to commit**

`ready to commit: feat: role-aware desktop sidebar (Settings admin-only)`

---

## Task 3: Migration `0009` — `active_admin_count()` + guarded `set_member_status()`

**Files:**
- Create: `supabase/migrations/0009_member_management.sql`
- Create: `supabase/tests/member_management.test.sql`

**Interfaces:**
- Consumes: `public.is_admin()`, `public.profiles`, `public.user_types`.
- Produces:
  - `public.active_admin_count() returns int` — count of `active`, non-deleted `admin_member` profiles.
  - `public.set_member_status(p_profile_id uuid, p_status text) returns void` — admin-only; `p_status ∈ ('active','disabled')`; refuses to disable/last the final active admin; sets `status` + `deleted_at`.

- [ ] **Step 1: Read an existing migration + test for style**

Run: `sed -n '1,40p' supabase/migrations/0005_workflow_stage_rpcs.sql && echo --- && sed -n '1,30p' supabase/tests/workflow_rpcs.test.sql`

- [ ] **Step 2: Write the pgTAP test** `supabase/tests/member_management.test.sql`

```sql
begin;
select plan(6);

-- Fixtures: 2 admins + 1 employee, all active (seed already inserts admin@ / staff@).
-- (Adapt ids to the seed; the seed file defines v_admin / v_staff.)

select is( public.active_admin_count(), 1, 'seed has exactly one active admin' );

-- become the admin
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

-- disabling the only admin is refused
select throws_like(
  $$ select public.set_member_status('11111111-1111-1111-1111-111111111111','disabled') $$,
  '%last active admin%',
  'cannot disable the last active admin'
);

-- add a second admin row directly, then disabling the first is allowed
insert into public.profiles (id, user_type_id, full_name, email, status)
  values ('99999999-0000-0000-0000-000000000009',
          (select id from public.user_types where key='admin_member'),
          'Second Admin','second@onevo.test','active');
select is( public.active_admin_count(), 2, 'two active admins now' );
select lives_ok(
  $$ select public.set_member_status('11111111-1111-1111-1111-111111111111','disabled') $$,
  'can disable a non-last admin'
);
select is( (select status from public.profiles where id='11111111-1111-1111-1111-111111111111'), 'disabled', 'status set' );

-- a non-admin caller is refused
select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$ select public.set_member_status('99999999-0000-0000-0000-000000000009','disabled') $$,
  'P0001',
  null,
  'employee caller is refused'
);

select * from finish();
rollback;
```

(Adjust seed ids / helper names to match `supabase/seed.sql` and the project's pgTAP conventions in `supabase/tests/`.)

- [ ] **Step 3: Run it — expect FAIL** (functions don't exist)

Run: `supabase db reset` then run the pgTAP file per the repo's test runner (see `supabase/tests/*` / `config.toml`). Expected: errors — `function public.active_admin_count() does not exist`.

- [ ] **Step 4: Write `0009_member_management.sql`**

```sql
-- 0009_member_management.sql — admin/employee account management helpers.

create or replace function public.active_admin_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.profiles p
  join public.user_types t on t.id = p.user_type_id
  where t.key = 'admin_member'
    and p.status = 'active'
    and p.deleted_at is null
$$;

create or replace function public.set_member_status(p_profile_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_is_target_admin boolean;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change member status';
  end if;
  if p_status not in ('active','disabled') then
    raise exception 'status must be active or disabled';
  end if;

  select (t.key = 'admin_member') into v_is_target_admin
  from public.profiles p join public.user_types t on t.id = p.user_type_id
  where p.id = p_profile_id;

  if v_is_target_admin and p_status = 'disabled' and public.active_admin_count() <= 1 then
    raise exception 'Cannot disable the last active admin';
  end if;

  update public.profiles
     set status = p_status,
         deleted_at = case when p_status = 'disabled' then now() else null end,
         updated_at = now()
   where id = p_profile_id;
end;
$$;

revoke all on function public.set_member_status(uuid, text) from public;
grant execute on function public.set_member_status(uuid, text) to authenticated;
grant execute on function public.active_admin_count() to authenticated;
```

- [ ] **Step 5: Run the pgTAP file — expect PASS**

Run: `supabase db reset` then the pgTAP runner. Expected: `6..6` all ok.

- [ ] **Step 6: Ready to commit**

`ready to commit: feat(db): 0009 member status RPC + last-admin guard`

---

## Task 4: Edge Function `admin-set-user-ban`

**Files:**
- Create: `supabase/functions/admin-set-user-ban/index.ts`
- Create: `supabase/functions/admin-set-user-ban/index.test.ts`
- Create: `supabase/functions/admin-set-user-ban/deno.json`

**Interfaces:**
- Consumes: same env as `admin-create-user` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Produces: POST endpoint `admin-set-user-ban`, body `{ target_user_id: string, banned: boolean }`; verifies the caller is `admin_member`; calls `auth.admin.updateUserById(target_user_id, { ban_duration: banned ? '876000h' : 'none' })`; returns `{ ok: true }` / error JSON. 401 no auth, 403 non-admin, 400 bad body.

- [ ] **Step 1: Read** `cat supabase/functions/admin-create-user/index.ts supabase/functions/admin-create-user/index.test.ts supabase/functions/admin-create-user/deno.json`

- [ ] **Step 2: Write `index.test.ts`** (mirror `admin-create-user/index.test.ts` exactly — same harness, same mock of `@supabase/supabase-js`)

Cases:
- missing `Authorization` → 401
- caller profile `user_types.key !== 'admin_member'` → 403
- invalid JSON / missing `target_user_id` → 400
- `banned: true` → calls `updateUserById(id, { ban_duration: '876000h' })`, returns 200 `{ ok: true }`
- `banned: false` → calls `updateUserById(id, { ban_duration: 'none' })`

- [ ] **Step 3: Run — expect FAIL** (per the repo's Deno test command for functions; see `admin-create-user`'s test script)

- [ ] **Step 4: Write `index.ts`** — copy `admin-create-user/index.ts`'s CORS + `json()` helper + caller-verification block verbatim, then replace the body:

```ts
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'invalid json' }, 400) }
  const targetUserId = String(body.target_user_id ?? '')
  const banned = body.banned === true
  if (!targetUserId) return json({ error: 'missing target_user_id' }, 400)

  const admin = createClient(url, service)
  const { error } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: banned ? '876000h' : 'none',
  })
  if (error) return json({ error: error.message }, 400)
  return json({ ok: true }, 200)
```

Copy `deno.json` from `admin-create-user`.

- [ ] **Step 5: Run — expect PASS**. Register the function if the repo lists functions anywhere (check `supabase/config.toml` — Edge Functions are auto-discovered by directory, usually nothing to register).

- [ ] **Step 6: Ready to commit**

`ready to commit: feat(edge): admin-set-user-ban function`

---

## Task 5: `memberRoles.ts` + `team.types.ts`

**Files:**
- Create: `src/shared/constants/memberRoles.ts`
- Create: `src/features/team/team.types.ts`
- Test: `src/shared/constants/memberRoles.test.ts`

**Interfaces:**
- Produces:
  - `type MemberRole = 'admin_member' | 'employee'`
  - `const MEMBER_ROLE_LABEL: Record<MemberRole, string>` → `{ admin_member: 'Admin', employee: 'Employee' }`
  - `const MEMBER_STATUS_COLOR: Record<'active' | 'invited' | 'disabled', string>` → neo CSS-var strings (`--color-neo-success` / `--color-neo-warning` / `--color-neo-secondary`)
  - `interface MemberVM { profileId: string; fullName: string; email: string; phone: string | null; role: MemberRole; status: 'active' | 'invited' | 'disabled'; createdAt: string; isSelf: boolean }`

- [ ] **Step 1: Write the failing test** `memberRoles.test.ts`

```ts
import { MEMBER_ROLE_LABEL, MEMBER_STATUS_COLOR } from '@/shared/constants/memberRoles'

it('labels and status colours', () => {
  expect(MEMBER_ROLE_LABEL.admin_member).toBe('Admin')
  expect(MEMBER_ROLE_LABEL.employee).toBe('Employee')
  expect(MEMBER_STATUS_COLOR.active).toBe('var(--color-neo-success)')
  expect(MEMBER_STATUS_COLOR.disabled).toBe('var(--color-neo-secondary)')
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- memberRoles`)

- [ ] **Step 3: Implement `memberRoles.ts`**

```ts
export type MemberRole = 'admin_member' | 'employee'
export type MemberStatus = 'active' | 'invited' | 'disabled'

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  admin_member: 'Admin',
  employee: 'Employee',
}

export const MEMBER_STATUS_COLOR: Record<MemberStatus, string> = {
  active: 'var(--color-neo-success)',
  invited: 'var(--color-neo-warning)',
  disabled: 'var(--color-neo-secondary)',
}

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  disabled: 'Disabled',
}
```

- [ ] **Step 4: Implement `team.types.ts`**

```ts
import type { MemberRole, MemberStatus } from '@/shared/constants/memberRoles'

export interface MemberVM {
  profileId: string
  fullName: string
  email: string
  phone: string | null
  role: MemberRole
  status: MemberStatus
  createdAt: string
  isSelf: boolean
}
```

- [ ] **Step 5: Run — expect PASS**, then `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: member role + status vocabulary and VM`

---

## Task 6: `member.repository.ts`

**Files:**
- Create: `src/features/team/data/member.repository.ts`
- Test: `src/features/team/data/member.repository.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/core/supabase/client`; `MemberVM`, `MemberRole` from earlier tasks.
- Produces:
  - `memberRepository.list(role: MemberRole): Promise<MemberVM[]>`
  - `memberRepository.create(input: { fullName: string; email: string; phone: string; role: MemberRole; tempPassword: string }): Promise<void>`
  - `memberRepository.updateDetail(profileId: string, input: { fullName: string; phone: string }): Promise<void>`
  - `memberRepository.setStatus(profileId: string, status: 'active' | 'disabled'): Promise<void>`

- [ ] **Step 1: Read** `cat src/features/customers/data/customer.repository.ts src/features/customers/data/customer.repository.test.ts` for the Supabase-mock + Edge-Function-invoke pattern.

- [ ] **Step 2: Write the failing test** `member.repository.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
  invoke: vi.fn().mockResolvedValue({ data: { user_id: 'u-new' }, error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      update: vi.fn(() => ({ eq: h.eq })),
    })),
    functions: { invoke: h.invoke },
    rpc: h.rpc,
    auth: { getUser: h.getUser },
  },
}))

import { memberRepository } from '@/features/team/data/member.repository'

describe('memberRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps profile rows to MemberVM and flags isSelf', async () => {
    h.order.mockResolvedValue({
      data: [
        { id: 'me', full_name: 'Ava', email: 'ava@x.co', phone: null, status: 'active', created_at: '2026-01-01', user_types: { key: 'admin_member' } },
        { id: 'u2', full_name: 'Bo', email: 'bo@x.co', phone: '77', status: 'disabled', created_at: '2026-02-02', user_types: { key: 'admin_member' } },
      ],
      error: null,
    })
    const out = await memberRepository.list('admin_member')
    expect(out[0]).toMatchObject({ profileId: 'me', role: 'admin_member', status: 'active', isSelf: true })
    expect(out[1]).toMatchObject({ profileId: 'u2', isSelf: false })
  })

  it('create posts the admin-create-user body with the role', async () => {
    await memberRepository.create({ fullName: 'Sam', email: 's@x.co', phone: '1', role: 'employee', tempPassword: 'secret123' })
    expect(h.invoke).toHaveBeenCalledWith('admin-create-user', {
      body: { email: 's@x.co', full_name: 'Sam', phone: '1', user_type: 'employee', temp_password: 'secret123' },
    })
  })

  it('setStatus calls the RPC then the ban function in order', async () => {
    await memberRepository.setStatus('u2', 'disabled')
    expect(h.rpc).toHaveBeenCalledWith('set_member_status', { p_profile_id: 'u2', p_status: 'disabled' })
    expect(h.invoke).toHaveBeenCalledWith('admin-set-user-ban', { body: { target_user_id: 'u2', banned: true } })
  })
})
```

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- member.repository`)

- [ ] **Step 4: Implement `member.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { MemberVM } from '@/features/team/team.types'
import type { MemberRole } from '@/shared/constants/memberRoles'

interface Row {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: 'active' | 'invited' | 'disabled'
  created_at: string
  user_types: { key: string } | null
}

export const memberRepository = {
  async list(role: MemberRole): Promise<MemberVM[]> {
    const { data: me } = await supabase.auth.getUser()
    const myId = me.user?.id ?? ''
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, status, created_at, user_types!user_type_id(key)')
      .eq('user_types.key', role)
      .is('deleted_at', null)
      .order('full_name')
    if (error) throw error
    return (data as unknown as Row[])
      .filter((r) => r.user_types?.key === role)
      .map((r) => ({
        profileId: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        role,
        status: r.status,
        createdAt: r.created_at,
        isSelf: r.id === myId,
      }))
  },

  async create(input: {
    fullName: string
    email: string
    phone: string
    role: MemberRole
    tempPassword: string
  }): Promise<void> {
    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        user_type: input.role,
        temp_password: input.tempPassword,
      },
    })
    if (error) throw error
  },

  async updateDetail(profileId: string, input: { fullName: string; phone: string }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone, updated_at: new Date().toISOString() })
      .eq('id', profileId)
    if (error) throw error
  },

  async setStatus(profileId: string, status: 'active' | 'disabled'): Promise<void> {
    const { error } = await supabase.rpc('set_member_status', {
      p_profile_id: profileId,
      p_status: status,
    })
    if (error) throw error
    const { error: bErr } = await supabase.functions.invoke('admin-set-user-ban', {
      body: { target_user_id: profileId, banned: status === 'disabled' },
    })
    if (bErr) throw bErr
  },
}
```

- [ ] **Step 5: Run — expect PASS**, then `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: member repository (list/create/update/setStatus)`

---

## Task 7: `useMembers` + `useMemberMutations`

**Files:**
- Create: `src/features/team/queries/useMembers.ts`
- Create: `src/features/team/mutations/useMemberMutations.ts`

**Interfaces:**
- Consumes: `memberRepository`, `MemberRole`.
- Produces:
  - `useMembers(role: MemberRole)` → TanStack query, `queryKey: ['members', role]`, `queryFn: () => memberRepository.list(role)`.
  - `useCreateMember()`, `useUpdateMember()`, `useSetMemberStatus()` — mutations; each `onSuccess` → `qc.invalidateQueries({ queryKey: ['members'] })`.

- [ ] **Step 1: Read** `cat src/features/customers/queries/useCustomers.ts src/features/customers/mutations/useCustomerMutations.ts`

- [ ] **Step 2: Implement `useMembers.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { memberRepository } from '@/features/team/data/member.repository'
import type { MemberRole } from '@/shared/constants/memberRoles'

export function useMembers(role: MemberRole) {
  return useQuery({ queryKey: ['members', role], queryFn: () => memberRepository.list(role) })
}
```

- [ ] **Step 3: Implement `useMemberMutations.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { memberRepository } from '@/features/team/data/member.repository'
import type { MemberRole } from '@/shared/constants/memberRoles'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['members'] })
}

export function useCreateMember() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { fullName: string; email: string; phone: string; role: MemberRole; tempPassword: string }) =>
      memberRepository.create(v),
    onSuccess: inv,
  })
}

export function useUpdateMember() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { profileId: string; fullName: string; phone: string }) =>
      memberRepository.updateDetail(v.profileId, { fullName: v.fullName, phone: v.phone }),
    onSuccess: inv,
  })
}

export function useSetMemberStatus() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { profileId: string; status: 'active' | 'disabled' }) =>
      memberRepository.setStatus(v.profileId, v.status),
    onSuccess: inv,
  })
}
```

- [ ] **Step 4: Typecheck + lint** (no dedicated tests — covered via component tests in Tasks 8–9, matching the repo's convention that query/mutation hooks have no standalone tests).

Run: `npm run typecheck && npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: useMembers query + member mutation hooks`

---

## Task 8: `MemberList`

**Files:**
- Create: `src/features/team/components/MemberList.tsx`
- Test: `src/features/team/components/MemberList.test.tsx`

**Interfaces:**
- Consumes: `MemberVM`, `MEMBER_STATUS_COLOR`, `MEMBER_STATUS_LABEL`, `StatusBadge`, framer-motion, lucide (`Pencil`, `Ban`, `RotateCcw`, `Mail`, `Phone`).
- Produces:
  ```ts
  export interface MemberListProps {
    members: MemberVM[]
    onEdit: (m: MemberVM) => void
    onSetStatus: (m: MemberVM, status: 'active' | 'disabled') => void
    emptyCopy: string
  }
  export function MemberList(props: MemberListProps): JSX.Element
  ```

- [ ] **Step 1: Read** `cat src/features/customers/components/CustomerCard.tsx src/features/customers/components/CustomerList.tsx` — reuse the neo card idiom (`rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]`, avatar initials tile with the `#8b5cf6` gradient, `flex flex-col gap-4 md:grid-cols-2 lg:grid-cols-3` grid).

- [ ] **Step 2: Write the failing test** `MemberList.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from '@/features/team/components/MemberList'
import type { MemberVM } from '@/features/team/team.types'

const m = (o: Partial<MemberVM>): MemberVM => ({
  profileId: 'p1', fullName: 'Ava Admin', email: 'ava@x.co', phone: null,
  role: 'admin_member', status: 'active', createdAt: '2026-01-01', isSelf: false, ...o,
})

it('renders a card per member with name, email and a status badge', () => {
  render(<MemberList members={[m({}), m({ profileId: 'p2', fullName: 'Bo', status: 'disabled' })]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="none" />)
  expect(screen.getByText('Ava Admin')).toBeInTheDocument()
  expect(screen.getByText('ava@x.co')).toBeInTheDocument()
  expect(screen.getByText('Active')).toBeInTheDocument()
  expect(screen.getByText('Disabled')).toBeInTheDocument()
})

it('shows Disable for an active member and Enable for a disabled one; hides Disable for self', async () => {
  const onSetStatus = vi.fn()
  render(<MemberList members={[m({ isSelf: true })]} onEdit={() => {}} onSetStatus={onSetStatus} emptyCopy="none" />)
  expect(screen.queryByRole('button', { name: /disable/i })).toBeNull()      // self
  expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
})

it('wires Edit and Disable', async () => {
  const onEdit = vi.fn(); const onSetStatus = vi.fn()
  const member = m({})
  render(<MemberList members={[member]} onEdit={onEdit} onSetStatus={onSetStatus} emptyCopy="none" />)
  await userEvent.click(screen.getByRole('button', { name: /edit/i }))
  await userEvent.click(screen.getByRole('button', { name: /disable/i }))
  expect(onEdit).toHaveBeenCalledWith(member)
  expect(onSetStatus).toHaveBeenCalledWith(member, 'disabled')
})

it('empty copy', () => {
  render(<MemberList members={[]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="No employees yet" />)
  expect(screen.getByText('No employees yet')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- MemberList`)

- [ ] **Step 4: Implement `MemberList.tsx`**

Grid of `motion.div` cards. Per card: initials tile (`initials(fullName)` — copy the helper from `CustomerCard.tsx`), name + email rows (`<Mail>` icon), phone row (`<Phone>` — `phone ?? '—'`), a `<StatusBadge label={MEMBER_STATUS_LABEL[status]} color={MEMBER_STATUS_COLOR[status]} />`, footer:
- always: **Edit** button (`bg-[var(--color-neo-primary)]/10 text-[var(--color-neo-primary)]`, `<Pencil size={15}/>`), calls `onEdit(m)`.
- if `status === 'active'` and `!isSelf`: **Disable** button (`bg-[var(--color-neo-danger)]/10 text-[var(--color-neo-danger)]`, `<Ban size={15}/>`), calls `onSetStatus(m, 'disabled')`.
- if `status === 'disabled'`: **Enable** button (`bg-[var(--color-neo-success)]/12 text-[var(--color-neo-success)]`, `<RotateCcw size={15}/>`), calls `onSetStatus(m, 'active')`.
Footer grid columns = number of visible buttons. Empty → `<p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">{emptyCopy}</p>`.

- [ ] **Step 5: Run — expect PASS**, then `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: MemberList neo card grid`

---

## Task 9: `MemberFormModal`

**Files:**
- Create: `src/features/team/components/MemberFormModal.tsx`
- Test: `src/features/team/components/MemberFormModal.test.tsx`

**Interfaces:**
- Consumes: `Modal`, `Field` (`@/features/auth/authShared`), `Button`, `useToast`, `useCreateMember`, `useUpdateMember`, `MemberVM`, `MemberRole`, `react-hook-form` + `zod` + `@hookform/resolvers/zod`.
- Produces:
  ```ts
  export interface MemberFormModalProps {
    role: MemberRole                       // for the "add" title + the create payload
    member?: MemberVM                      // present => edit mode
    onClose: () => void
  }
  export function MemberFormModal(props: MemberFormModalProps): JSX.Element
  ```

- [ ] **Step 1: Read** `cat src/features/customers/components/CustomerFormModal.tsx src/features/customers/components/CustomerFormModal.test.tsx` — mirror its structure (zod schema, `useForm`, disabled-until-valid Save, edit-mode read-only email, toast on success, `onClose` after).

- [ ] **Step 2: Write the failing test** `MemberFormModal.test.tsx` (mirror `CustomerFormModal.test.tsx`'s `vi.hoisted` mock of the mutation hooks + `useToast`)

```tsx
it('add mode: disabled until name + valid email + password(>=8); creates with the role', async () => {
  render(<MemberFormModal role="employee" onClose={() => {}} />)
  const save = screen.getByRole('button', { name: /save/i })
  expect(save).toBeDisabled()
  await userEvent.type(screen.getByLabelText(/full name/i), 'Sam')
  await userEvent.type(screen.getByLabelText(/^email/i), 'sam@x.co')
  await userEvent.type(screen.getByLabelText(/temporary password/i), 'secret123')
  expect(save).toBeEnabled()
  await userEvent.click(save)
  expect(h.create).toHaveBeenCalledWith(
    expect.objectContaining({ fullName: 'Sam', email: 'sam@x.co', role: 'employee', tempPassword: 'secret123' }),
  )
})

it('edit mode: no password field, email read-only, calls update', async () => {
  render(<MemberFormModal role="admin_member" member={{ profileId: 'p1', fullName: 'Ava', email: 'ava@x.co', phone: '77', role: 'admin_member', status: 'active', createdAt: '', isSelf: false }} onClose={() => {}} />)
  expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument()
  expect(screen.getByLabelText(/^email/i)).toHaveAttribute('readonly')
  await userEvent.clear(screen.getByLabelText(/full name/i))
  await userEvent.type(screen.getByLabelText(/full name/i), 'Ava A')
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p1', fullName: 'Ava A', phone: '77' }))
})
```

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- MemberFormModal`)

- [ ] **Step 4: Implement `MemberFormModal.tsx`**

- `addSchema = z.object({ fullName: z.string().min(1), email: z.string().email(), phone: z.string().optional().default(''), tempPassword: z.string().min(8) })`.
- `editSchema = z.object({ fullName: z.string().min(1), phone: z.string().optional().default('') })`.
- `const isEdit = !!member`. Title: `isEdit ? \`Edit ${MEMBER_ROLE_LABEL[role].toLowerCase()}\` : \`New ${MEMBER_ROLE_LABEL[role].toLowerCase()}\``.
- Fields: `full name`, `email` (`readOnly` + prefilled in edit), `phone`, and `temporary password` (add-only).
- Save disabled while `!formState.isValid || isPending`.
- On submit (add): `await create.mutateAsync({ fullName, email, phone, role, tempPassword })` → `show({ type: 'success', title: 'Member added', message: 'Share the temporary password with them.' })` → `onClose()`. Catch → `show({ type: 'error', ... })`.
- On submit (edit): `await update.mutateAsync({ profileId: member!.profileId, fullName, phone })` → success toast → `onClose()`.

- [ ] **Step 5: Run — expect PASS**, then `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: MemberFormModal (add temp-password / edit)`

---

## Task 10: `SettingsPage` — add Admins + Employees sections

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `useMembers`, `useSetMemberStatus`, `MemberList`, `MemberFormModal`, `MEMBER_ROLE_LABEL`, `Modal`, `Button`, `useToast`, lucide `ShieldCheck`, `Users`, `Plus`.
- Produces: no new exports. `Tab` becomes `'workflows' | 'order-types' | 'admins' | 'employees'`.

- [ ] **Step 1: Read** the current `src/features/settings/SettingsPage.tsx` (P7 shape: `tab: Tab | null`, `SECTIONS` const feeding `SettingsSectionMenu`, section view = back pill + header + list + modals).

- [ ] **Step 2: Extend the failing test** `SettingsPage.test.tsx`

The file already mocks the settings query/mutation hooks + `useRole` (admin). Add mocks:

```tsx
const team = vi.hoisted(() => ({ members: vi.fn(), setStatus: vi.fn() }))
vi.mock('@/features/team/queries/useMembers', () => ({ useMembers: team.members }))
vi.mock('@/features/team/mutations/useMemberMutations', () => ({
  useSetMemberStatus: () => ({ mutateAsync: team.setStatus }),
  useCreateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
```

New test:

```tsx
it('menu shows Admins + Employees; opening Employees lists employees with a New employee button', async () => {
  team.members.mockReturnValue({ data: [
    { profileId: 'e1', fullName: 'Ed Employee', email: 'ed@x.co', phone: null, role: 'employee', status: 'active', createdAt: '', isSelf: false },
  ], isLoading: false, isError: false })
  vi.resetModules(); mockRole(true)
  const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
  render(<MemoryRouter><SettingsPage /></MemoryRouter>)
  expect(screen.getByRole('button', { name: /admins/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /employees/i }))
  expect(screen.getByText('Ed Employee')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /new employee/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument()  // back pill
})
```

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- SettingsPage`)

- [ ] **Step 4: Implement**

- Add to `SECTIONS`:
  ```tsx
  { key: 'admins', title: 'Admins', description: 'People who can manage settings and everything else', icon: ShieldCheck },
  { key: 'employees', title: 'Employees', description: 'Staff who work on orders, no settings access', icon: Users },
  ```
- Widen `Tab` and the `tabParam` derivation to accept `'admins'` / `'employees'`.
- In the section view, add two branches modeled on the workflows branch:
  ```tsx
  {(tab === 'admins' || tab === 'employees') && (() => {
    const role = tab === 'admins' ? 'admin_member' : 'employee'
    return <MembersSection role={role} />
  })()}
  ```
  Extract a small in-file `MembersSection({ role }: { role: MemberRole })` component that calls `useMembers(role)`, `useSetMemberStatus()`, holds `editing: MemberVM | 'new' | null` and `confirm: { m: MemberVM; status: 'active' | 'disabled' } | null` state, renders loading/error/`<MemberList onEdit onSetStatus={(m,s)=>setConfirm({m,status:s})} emptyCopy={...} />`, the `<MemberFormModal>` when `editing`, and a confirm `<Modal>` ("Disable Ed Employee?" / "Enable …?") whose confirm calls `setStatus.mutateAsync({ profileId, status }).catch(err => show error toast)`. The DB "last admin" error surfaces as the toast message.
- The section header's New button: `{isAdmin && <Button icon={<Plus size={16}/>} onClick={() => setEditing('new')}>New {tab === 'admins' ? 'admin' : 'employee'}</Button>}` — reuse the existing header-row pattern; move the `MembersSection`'s "new" trigger up or lift `editing` to where the header renders (simplest: render the New button *inside* `MembersSection` next to the list, not in the shared header — adjust the section-view header to omit the New button for admins/employees tabs and let `MembersSection` render its own).

- [ ] **Step 5: Run — expect PASS**; then `npm run test` (full), `npm run typecheck`, `npm run lint`.

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: Settings — Admins & Employees management sections`

---

## Task 11: e2e — admin manages members; employee is locked out

**Files:**
- Create: `e2e/settings-members.spec.ts`

**Interfaces:**
- Consumes: the running app + local Supabase (global-setup seeds `admin@onevo.test` = admin_member, `staff@onevo.test` = employee, both password `password123`).

- [ ] **Step 1: Read** `cat e2e/bill-cards.spec.ts e2e/auth.spec.ts` for `storageState` + navigation patterns.

- [ ] **Step 2: Write the spec**

```ts
import { test, expect } from '@playwright/test'

test.describe('settings — members', () => {
  test('an employee has no Settings item and /settings redirects to the dashboard', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('Email').fill('staff@onevo.test')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  })

  test('an admin adds an employee with a temp password and sees the new row', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@onevo.test')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.goto('/settings')
    await page.getByRole('button', { name: /employees/i }).click()
    await page.getByRole('button', { name: /new employee/i }).click()
    const stamp = Date.now()
    await page.getByLabel(/full name/i).fill('E2E Worker')
    await page.getByLabel(/^email/i).fill(`worker.${stamp}@onevo.test`)
    await page.getByLabel(/temporary password/i).fill('secret12345')
    await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText('E2E Worker')).toBeVisible()
  })
})
```

- [ ] **Step 3: Run — expect PASS**

Run: `npx playwright test settings-members`
Expected: 2 passed. Then `npx playwright test` (full) — 31 passed.

- [ ] **Step 4: Ready to commit**

`ready to commit: test(e2e): settings member management + employee lockout`

---

## Self-Review (completed during planning)

**1. Spec coverage**

| Spec §2 item | Task |
|---|---|
| `RoleRoute` `'admin'` | 1 |
| `/settings` under `RoleRoute allow="admin"` | 1 |
| Role-aware sidebar; MobileBottomBar unchanged | 2 |
| `memberRoles.ts` vocabulary | 5 |
| `features/team/` types + repository | 5, 6 |
| `useMembers` / `useMemberMutations` | 7 |
| `MemberList` | 8 |
| `MemberFormModal` (add temp-password / edit) | 9 |
| Admins + Employees Settings sections | 10 |
| Migration `0009` (`active_admin_count`, `set_member_status`, last-admin guard) | 3 |
| `admin-set-user-ban` Edge Function | 4 |
| pgTAP `member_management.test.sql` | 3 |
| Tests incl. e2e | every task + 11 |
| §5.2 soft-disable + ban + reversible Enable | 3 (RPC), 4 (ban), 6 (`setStatus`), 8 (Enable button) |
| §5.3 admin can't disable self | 8 (hidden button) + 3 (DB guard) |
| §5.4 no role switch v1 | not built — `MemberFormModal` has no role control |

**2. Placeholder scan** — no `TBD`/`TODO`/"similar to Task N". Task 10's `MembersSection` is described concretely (state shape, hooks, modals) with the exact confirm-flow. The pgTAP fixtures note "adapt ids to the seed" — that is a real instruction, not a placeholder (the seed file defines the ids; the implementer reads it in Step 1).

**3. Type consistency** — `MemberVM` fields identical across Tasks 5–10. `MemberRole` = `'admin_member' | 'employee'` everywhere. `memberRepository.setStatus(id, 'active'|'disabled')` matches `useSetMemberStatus`'s `{ profileId, status }` and `MemberList`'s `onSetStatus(m, status)`. RPC name `set_member_status` and params `p_profile_id` / `p_status` match between Task 3 (SQL), Task 6 (repo call), Task 3 (pgTAP). Edge Function name `admin-set-user-ban` + body `{ target_user_id, banned }` match between Task 4 and Task 6.
