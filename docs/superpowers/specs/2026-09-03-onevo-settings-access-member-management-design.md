# ONEVO — Settings Access + Member Management Design Spec (Effort A)

**Document type:** Design specification
**Date:** 2026-09-03
**Status:** Draft — awaiting review
**Part of:** a 3-way split of the "Settings features" request. This is **Effort A**.
Sibling specs: `2026-09-03-onevo-account-maintenance-design.md` (B),
`2026-09-03-onevo-home-cms-page-design.md` (C). A ships first.

---

## 1. Context

Settings today (`/settings`) is a Windows-style landing menu (`SettingsSectionMenu`) with
two rows — **Workflows** and **Order Types** — each opening a section with the neo card
lists. Any staff member can open `/settings`; write controls (`New…`, Edit, Delete) are
gated on `isAdmin` (`user_type = 'admin_member'`), so `employee`s see it read-only.

The request:

1. **Lock the whole Settings area to admins.** Employees should not see it at all.
2. Add an **Admin** section — list / add / edit / disable `admin_member` accounts.
3. Add an **Employees** section — list / add / edit / disable `employee` accounts.

The "Account" idea in the original ask has moved to Effort B ("Account maintenance");
"Company detail" has moved to Effort C ("Home" CMS page). Neither is in scope here.

### What already exists (verified)

- **Roles.** `user_types` rows: `admin_member`, `employee`, `customer`. Helpers
  `public.is_admin()` = `admin_member`, `public.is_staff()` = `admin_member OR employee`.
  Frontend: `isAdmin(profile)` / `isStaff(profile)` in `core/permissions`, surfaced by
  `useRole()` and `useAuth()` (`profile.userType`).
- **`profiles` table.** `id` (→ `auth.users`), `user_type_id`, `full_name`, `email`,
  `phone`, `status` `'active' | 'invited' | 'disabled'`, `created_by`, `created_at`,
  `updated_at`, `deleted_at`.
- **`profiles` RLS (already sufficient for reads/updates):**
  - `profiles_self_read`: `using (id = auth.uid() OR public.is_staff())` → **staff can already
    SELECT every profile.**
  - `profiles_self_update`: `using / with check (id = auth.uid() OR public.is_admin())` →
    **an admin can already UPDATE any profile.**
  - `profiles_admin_insert`: `with check (public.is_admin())`.
- **`admin-create-user` Edge Function.** POST, verifies the caller is `admin_member`,
  then `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: {
  user_type, full_name, phone, created_by } })`. Accepts `user_type ∈ {admin_member,
  employee, customer}`. Returns `{ user_id }`. A `handle_new_user` trigger creates the
  matching `profiles` row from `user_metadata`. This is exactly how customers are added
  today (`customerRepository.createWithLogin`).
- **`RoleRoute`** (`src/app/router/RoleRoute.tsx`) currently `allow: 'staff' | 'customer'`.
- **Sidebar / nav.** `SIDEBAR_NAV` (`components/navigation/navConfig.tsx`) is a static
  array `[...STAFF_NAV, Sales]`; `Sidebar.tsx` maps it. `MobileBottomBar` maps `STAFF_NAV`
  (4 tabs, no Settings).
- **`SettingsPage.tsx`** — `tab: 'workflows' | 'order-types' | null`; `SECTIONS` const
  drives `SettingsSectionMenu`; section view has a "← Settings" pill back + the list.
- Pattern references: `features/customers/**` (repository → edge fn + `profiles` update →
  `soft_delete_customer` RPC; `useCustomerMutations` with `invalidateQueries`;
  `CustomerFormModal` add/edit with `react-hook-form` + `zod`; `CustomerList` neo grid;
  `CustomerCard`).

---

## 2. Scope

### In scope

1. **`RoleRoute` gains `allow: 'admin'`.** `isStaff` check → for `'admin'` use `isAdmin`;
   a non-admin staff user hitting an admin route is redirected to `ROUTES.dashboard`.
2. **`/settings` moves under `<RoleRoute allow="admin">`** in `AppRouter` (its own nested
   `RoleRoute`, still inside the staff `RoleRoute` + `AppLayout`).
3. **Role-aware sidebar.** The "Settings" item renders only for `isAdmin`. `MobileBottomBar`
   already omits Settings — unchanged. Implementation: `navConfig` exposes
   `sidebarNavFor(profileIsAdmin: boolean): NavItem[]`; `AppLayout`/`Sidebar` pass
   `useRole().isAdmin`. `SIDEBAR_NAV` stays exported (= admin view) for back-compat/tests.
4. **`shared/constants/memberRoles.ts`** — `MEMBER_ROLE` vocabulary:
   `type MemberRole = 'admin_member' | 'employee'`; `MEMBER_ROLE_LABEL`; helpers used by
   both new sections.
5. **`features/team/` module** (new; camelCase VMs, Supabase only in `data/`):
   - `team.types.ts` — `MemberVM { profileId; fullName; email; phone; role: MemberRole;
     status: 'active' | 'invited' | 'disabled'; createdAt; isSelf: boolean }`.
   - `data/member.repository.ts`:
     - `list(role: MemberRole): MemberVM[]` — `select` from `profiles` joined to
       `user_types(key)`, `where user_types.key = role and deleted_at is null`,
       order by `full_name`. `isSelf` computed against the current auth user id.
     - `create(input: { fullName; email; phone; role: MemberRole; tempPassword }): void` —
       `supabase.functions.invoke('admin-create-user', { body: { email, full_name, phone,
       user_type: role, temp_password } })`. (`handle_new_user` writes the profile.)
     - `updateDetail(profileId, { fullName; phone }): void` — `update profiles`.
     - `setStatus(profileId, status: 'active' | 'disabled'): void` — calls the
       `set_member_status` RPC (below).
   - `queries/useMembers.ts` — `useMembers(role)` → `queryKey: ['members', role]`.
   - `mutations/useMemberMutations.ts` — `useCreateMember`, `useUpdateMember`,
     `useSetMemberStatus`; each `invalidateQueries({ queryKey: ['members'] })`.
   - `components/MemberList.tsx` — neo card grid (mirror `CustomerList` / the P3 Settings
     cards): avatar-initials tile, name + email, a **status badge**
     (`active`→success, `invited`→warning, `disabled`→secondary), a role chip, and a
     footer: **Edit** + **Disable**/**Enable** (never a hard Delete). All actions hidden
     when `member.isSelf` **and** the action is Disable (an admin cannot disable
     themselves). Empty copy per role.
   - `components/MemberFormModal.tsx` — add / edit (mirror `CustomerFormModal`):
     - **Add:** `fullName`, `email` (valid), `phone`, `tempPassword` (min 8). On save →
       `useCreateMember`. Toast with the temp password reminder ("share this with them").
     - **Edit:** `fullName`, `phone` only. `email` read-only. No password field. No role
       switch in v1 (see §5.4).
6. **Two new Settings sections** wired into `SECTIONS`:
   - `{ key: 'admins', title: 'Admins', description: 'People who can manage settings and
     everything else', icon: ShieldCheck }`
   - `{ key: 'employees', title: 'Employees', description: 'Staff who work on orders,
     no settings access', icon: Users }`
   `SettingsPage`'s `Tab` type becomes
   `'workflows' | 'order-types' | 'admins' | 'employees'`; the section view renders
   `<MemberList role="admin_member">` / `<MemberList role="employee">` with a "New admin" /
   "New employee" button, the back pill, and the `MemberFormModal` + a confirm `Modal` for
   Disable/Enable. (Workflows / Order Types sections unchanged.)
7. **DB migration `0009_member_management.sql`:**
   - `create function public.active_admin_count() returns int` — `select count(*) from
     profiles p join user_types t on t.id = p.user_type_id where t.key = 'admin_member'
     and p.status = 'active' and p.deleted_at is null`. `stable security definer`.
   - `create function public.set_member_status(p_profile_id uuid, p_status text)` —
     `security definer`; asserts caller `is_admin()`; asserts `p_status in
     ('active','disabled')`; **last-admin guard**: if the target is an `admin_member`,
     `p_status = 'disabled'`, and `active_admin_count() <= 1` → `raise exception 'Cannot
     disable the last active admin'`; else `update profiles set status = p_status,
     deleted_at = case when p_status = 'disabled' then now() else null end, updated_at =
     now() where id = p_profile_id`. Returns void.
   - **No new RLS policies needed** for read/update (existing policies cover it); the RPC
     is `security definer` and does its own `is_admin()` check.
8. **`admin-set-user-ban` Edge Function** (new; small, mirrors `admin-create-user`):
   POST `{ target_user_id, banned: boolean }`; verifies caller `is_admin()`; then
   `auth.admin.updateUserById(target_user_id, { ban_duration: banned ? '87600h' : 'none' })`
   (10 years ≈ permanent; `'none'` lifts it). `member.repository.setStatus` calls this
   **after** the `set_member_status` RPC succeeds, so a disabled member also cannot sign in.
   Enable reverses both.
9. **Tests** — §6.

### Out of scope

- Email invites / `status = 'invited'` flow (temp-password only — see §5.1). The
  `'invited'` status value stays in the enum and is displayed if present, but nothing in
  this effort sets it.
- Changing a member's **role** (admin ⇄ employee) after creation — §5.4.
- Password reset / "resend credentials" from the member screen — a member uses the normal
  `/forgot-password` flow.
- Per-permission granularity (everything is the binary `admin_member` vs `employee`).
- Account maintenance (Effort B), Home CMS page (Effort C).
- Any change to how customers are managed.
- Audit-log UI (the `audit_logs` table + `audit_admin_read` policy already exist; surfacing
  them is a later effort).

---

## 3. Architecture

```
src/
├── shared/constants/memberRoles.ts                 (new)
├── app/router/RoleRoute.tsx                         (edit) + 'admin'
├── app/router/AppRouter.tsx                         (edit) wrap /settings in RoleRoute allow="admin"
├── components/navigation/
│   ├── navConfig.tsx                                (edit) sidebarNavFor(isAdmin)
│   ├── Sidebar.tsx                                  (edit) role-aware nav
│   └── (MobileBottomBar unchanged)
├── layouts/AppLayout.tsx                            (edit) pass isAdmin to Sidebar
├── features/
│   ├── team/
│   │   ├── team.types.ts                            (new)
│   │   ├── data/member.repository.ts (+ .test.ts)   (new)
│   │   ├── queries/useMembers.ts                    (new)
│   │   ├── mutations/useMemberMutations.ts          (new)
│   │   └── components/
│   │       ├── MemberList.tsx (+ .test.tsx)         (new)
│   │       └── MemberFormModal.tsx (+ .test.tsx)    (new)
│   └── settings/
│       ├── SettingsPage.tsx (+ .test.tsx)           (edit) Tab union + 2 sections
│       └── components/SettingsSectionMenu.tsx       (unchanged; new rows via SECTIONS)
supabase/
├── migrations/0009_member_management.sql            (new)
├── functions/admin-set-user-ban/index.ts (+ test)   (new)
└── tests/member_management.test.sql                 (new, pgTAP)
```

**Data flow.** `useMembers(role)` → `member.repository.list(role)` (single `profiles`
select). Add → Edge Function `admin-create-user` (service role) → trigger writes the
profile → `invalidateQueries(['members'])`. Disable → `set_member_status` RPC (guarded) →
`admin-set-user-ban` Edge Function → invalidate. Route/nav gating is pure client
(`isAdmin`), backed by the fact that every write path already enforces `is_admin()` in
the DB / Edge Function regardless of the UI.

**Isolation.** `member.repository` is the only Supabase caller. `MemberList` / `MemberCard`
markup take a VM + callbacks. `MemberFormModal` mirrors `CustomerFormModal`'s shape so the
review surface is familiar.

---

## 4. Data layer — `member.repository.ts`

| Function | Returns | Notes |
|---|---|---|
| `list(role)` | `MemberVM[]` | `profiles` ⋈ `user_types(key)`, `key = role`, `deleted_at is null`, order `full_name`. `isSelf = row.id === (await supabase.auth.getUser()).data.user?.id` |
| `create({fullName,email,phone,role,tempPassword})` | `void` | `functions.invoke('admin-create-user', { body: { email, full_name, phone, user_type: role, temp_password } })`; throws on `error` |
| `updateDetail(profileId,{fullName,phone})` | `void` | `update profiles set full_name, phone, updated_at=now() where id=` |
| `setStatus(profileId, status)` | `void` | `rpc('set_member_status', { p_profile_id, p_status: status })` then `functions.invoke('admin-set-user-ban', { body: { target_user_id: profileId, banned: status === 'disabled' } })` |

`MemberVM`: `{ profileId, fullName, email, phone: string | null, role, status, createdAt,
isSelf }`.

---

## 5. Interim decisions (provisional — change at review)

1. **Add = temp password, reusing `admin-create-user`.** No email/SMTP work. The add modal
   requires a `tempPassword` (min 8) and the success toast reminds the admin to hand it
   over. (User-confirmed.)
2. **Remove = soft disable + last-admin guard.** `set_member_status(p_id,'disabled')` sets
   `status='disabled'` + `deleted_at=now()` and is refused by the DB function when it would
   leave zero active admins; `admin-set-user-ban` also bans the auth user so they cannot
   sign in. **Enable** reverses both (`status='active'`, `deleted_at=null`, unban). No hard
   delete anywhere in this effort. (User-confirmed.)
3. **An admin cannot disable themselves** from the UI (the Disable button is hidden when
   `isSelf`); the DB guard is the real backstop.
4. **No role switching in v1.** To move someone between admin and employee, disable the old
   account and create a new one. Rationale: role lives in `user_types` via `user_type_id`
   on `profiles`; changing it safely (and in `auth.users` metadata) is a follow-up. Flag
   for review — if wanted now, add `set_member_role` RPC (admin-only, last-admin-guarded)
   + a role control in the edit modal.
5. **Sidebar for non-admins:** the "Settings" row simply isn't rendered. Deep-linking to
   `/settings` as an employee → `RoleRoute` redirects to `/` (Dashboard). No "access
   denied" page.
6. **Existing `SettingsPage` tests:** the two admin/non-admin tests currently mount at
   `/?tab=workflows`; they keep working (admin path). The non-admin test asserts write
   controls are hidden — still valid, though now the whole route is admin-gated at a layer
   the unit test doesn't exercise. Keep the unit assertion; route-gating is covered by a
   `RoleRoute` test.
7. **`created_by`** is set by the Edge Function from the caller's `auth.uid()` — nothing to
   do in the repo.

---

## 6. Testing

| File | Asserts |
|---|---|
| `RoleRoute.test.tsx` (extend) | `allow="admin"` renders `<Outlet/>` for an `admin_member`; redirects an `employee` to `/`; still redirects a `customer` |
| `member.repository.test.ts` | `list('employee')` maps rows → `MemberVM` incl. `isSelf`; `create` posts the right `admin-create-user` body with `user_type`; `setStatus('disabled')` calls the RPC then the ban function in order; error propagation. (Mock `supabase` + `supabase.functions.invoke` like `bill.repository.test.ts` / `CustomerFormModal.test.tsx`.) |
| `useMemberMutations` (via component tests) | invalidation of `['members']` on each mutation |
| `MemberList.test.tsx` | N cards for N members; status badge per status; Edit + Disable shown; Disable hidden when `isSelf`; Enable shown for a disabled member; empty copy; handler calls |
| `MemberFormModal.test.tsx` | add: disabled until name + valid email + password(≥8); calls `create` with the payload incl. `role`. edit: email read-only, no password field, calls `updateDetail` |
| `SettingsPage.test.tsx` (extend) | menu shows all 4 rows (Workflows, Order Types, Admins, Employees); clicking "Employees" → `<MemberList>` for employees + "New employee" + back; back → menu |
| `navConfig.test.tsx` (extend) | `sidebarNavFor(true)` includes Settings; `sidebarNavFor(false)` omits it; `STAFF_NAV` still length 4 |
| `supabase/tests/member_management.test.sql` (pgTAP) | `set_member_status` refuses to disable the last active admin; disables a non-last admin; `active_admin_count()` correct; non-admin caller → exception |

**Edge Function tests:** `admin-set-user-ban/index.test.ts` mirrors
`admin-create-user/index.test.ts` — 401 without auth, 403 for non-admin, calls
`auth.admin.updateUserById` with the right `ban_duration` for `banned` true/false.

**Definition of done per stage:** `npm run test` green, `npm run typecheck` clean,
`npm run lint` clean; `supabase db reset` applies `0009` cleanly and the pgTAP file passes;
`npx playwright test` green (add one e2e: admin opens Settings → Employees → creates an
employee with a temp password → the new row appears; an employee-role login has no Settings
item and `/settings` redirects to `/`).

---

## 7. Delivery — one plan, ordered stages

1. **Route + nav gating.** `RoleRoute` `'admin'`; `AppRouter` wraps `/settings`;
   `navConfig.sidebarNavFor` + `Sidebar`/`AppLayout` role-aware; tests. (No DB.)
2. **DB migration `0009` + Edge Function.** `active_admin_count`, `set_member_status`,
   `admin-set-user-ban`; pgTAP + Edge Function tests; `supabase db reset` clean.
3. **`team` data layer.** `memberRoles.ts`, `team.types.ts`, `member.repository.ts`,
   `useMembers`, `useMemberMutations`; repo tests.
4. **`team` components.** `MemberList`, `MemberFormModal`; component tests.
5. **Settings wiring.** `SettingsPage` `Tab` union + `SECTIONS` rows + section views +
   confirm modal; `SettingsPage.test` extension; one e2e.

Each stage: `npm run test && npm run typecheck && npm run lint` green, then
`ready to commit: <msg>` — the user commits. **Do NOT run git.**

---

## 8. Constraints (carried forward)

- Supabase access only in `features/*/data/*.repository.ts`; `team` has one repository.
- View models camelCase; DB rows snake_case until mapped.
- Reuse `formatCurrency` / `formatLKRShort`; no new currency helpers.
- Neo tokens only (`src/index.css` `@theme`); sanctioned non-token literals unchanged
  (`#8b5cf6`, `#a9750b`, the Task-18 glass `rgba`). New status colours reuse
  `--color-neo-success` / `--color-neo-warning` / `--color-neo-secondary`.
- Tests colocated `*.test.ts(x)`; hooks mocked with `vi.hoisted` + `vi.mock`.
- **This effort DOES touch `supabase/`** (migration `0009`, one new Edge Function, one
  pgTAP file) — the prior "never modify `supabase/`" constraint is lifted for the parts
  named in §2; do not touch existing migrations `0001`–`0008`.
- `lucide-react@1.38`: `ShieldCheck`, `Users` are exported — verify at implementation and
  substitute the nearest if not, noting the swap.
- Do NOT run git; `ready to commit:` per task.
