# ONEVO — Phase 1 (Foundation) Design Spec

**Document type:** Design specification
**Date:** 2026-09-01
**Phase:** 1 of 5 (Foundation)
**Status:** Draft — awaiting review

---

## 1. Context

ONEVO is a **single-tenant order-management + light CRM** web app for a small
business that takes customer orders, runs each order through a configurable
workflow, and shows customers the live status of their orders and bills.

This is a personal project by an individual developer, built fresh (not a
continuation of the existing `New folder/` prototype). The prototype is used
only as a **design reference** (neumorphic UI) and a **domain reference**
(entities, workflow concept).

The tech architecture follows
`ONEVO_CRM_React_Supabase_Single_Tenant_Architecture.md`: React + TypeScript +
Vite, Supabase (Auth / Postgres / RLS / Storage / Realtime), TanStack Query,
Zustand, React Router, feature-based folder structure.

### Hosting constraints

- Frontend: Vercel free (Hobby) tier.
- Backend: Supabase free tier. Free projects **pause after 7 days of
  inactivity** — the project is not deleted and keys do not change, but all API
  calls fail until a manual "Restore" from the dashboard. Phase 1 includes a
  keep-alive mechanism to prevent this.

---

## 2. Product model (whole product, for context)

```
Customer
  └── Bill                      order date, deadline, status, notes
        ├── Bill row            detail + optional order type + amount (+/-)
        │     └── if it has an order type, the row is a tracked ORDER that
        │         moves through that order type's WORKFLOW (stages)
        ├── Bill row ...
        └── Bill total = sum of all row amounts (rows may be negative =
            discount). Admin enters amounts at bill creation; total is always
            visible.

Order type  →  one Workflow template  →  ordered Stages
Bill status →  fixed set: Pending / Active / Completed / Paid (not editable)
```

**User types (3, stored in a table):** `admin_member`, `employee`, `customer`.
Phase 1 and the near-term product use **admin_member + customer** only.
`employee` exists in the schema but has no features yet (added in a later
phase when the product is sold to other businesses).

---

## 3. Phase decomposition

One project, one repo, one Supabase instance, one Vercel deployment. Work is
sequenced into 5 phases; each phase gets its own spec + implementation plan and
is verified before the next begins.

| # | Phase | Scope |
|---|---|---|
| **1** | **Foundation** *(this spec)* | Project scaffold, Supabase setup, **full DB schema + RLS + seed**, auth (email/password + Google), roles, app shell (routing, layouts, nav, design-system port), deployment + keep-alive, test setup |
| 2 | Admin config | Settings UI: order types, workflow templates, stages (CRUD + reorder) |
| 3 | Customers + Bills | Customer CRUD; bill create (customer select + rows + amounts), list, detail |
| 4 | Tracking + Customer portal | Stage advancement + history, customer "My Bills" views, attachments UI, realtime |
| 5 | Later | Employees, admin↔customer messaging beyond comments, polish |

---

## 4. Phase 1 scope

### In scope

1. Fresh Vite + React + TS project with the target folder structure.
2. Supabase project: **complete database schema for all 5 phases**, RLS
   policies, seed data, `admin-create-user` Edge Function, private
   `attachments` storage bucket.
3. Authentication: email/password + Google OAuth, account linking by email,
   customer self-registration, admin-created users, password reset.
4. App shell: routing with public/staff/customer route groups and guards,
   three layouts, TanStack Query + Zustand providers, Supabase client,
   `AuthProvider`, permission helpers, ported neumorphic design system and core
   UI components.
5. Placeholder pages for dashboard / bills / customers / settings / portal
   (correct layout + route, "coming soon" body).
6. Deployment to Vercel; GitHub Actions keep-alive cron; README with restore
   steps.
7. Test setup (Vitest + RTL) with smoke tests for permission helpers and route
   guards.

### Out of scope (later phases)

- Any real CRUD UI for customers, bills, order types, workflows, stages.
- Bill creation, order tracking, history views, customer portal content.
- File upload/download UI (schema + bucket only).
- Employee-specific features.
- Realtime subscriptions (client wiring deferred to Phase 4).

---

## 5. Tech stack

| Concern | Choice |
|---|---|
| UI | React + TypeScript |
| Build | Vite |
| Routing | React Router (v6+) |
| Server state | TanStack Query |
| UI state | Zustand |
| Styling | Tailwind CSS v4 + ported neo CSS variables |
| Animation / icons | Framer Motion, lucide-react |
| Backend | Supabase (`@supabase/supabase-js`) |
| DB migrations | Supabase CLI (`supabase/migrations/`) |
| Tests | Vitest + React Testing Library |
| Hosting | Vercel (frontend), Supabase (backend) |
| CI | GitHub Actions (keep-alive; lint/typecheck/test optional) |

---

## 6. Project structure

```
src/
├── app/
│   ├── App.tsx
│   ├── router/            AppRouter.tsx, ProtectedRoute.tsx, RoleRoute.tsx
│   └── providers/         QueryProvider.tsx, AuthProvider.tsx
├── core/
│   ├── auth/              auth.service.ts, auth.hooks.ts, auth.types.ts
│   ├── supabase/          client.ts, database.types.ts
│   ├── permissions/       permissions.ts   (isAdmin, isStaff, isCustomer)
│   └── config/            env.ts
├── shared/
│   ├── ui/                Card, PrimaryButton, StatusBadge, Modal, Toast (typed ports)
│   ├── hooks/  utils/  types/  constants/
├── layouts/              AuthLayout.tsx, AppLayout.tsx, PortalLayout.tsx
├── features/
│   ├── auth/             LoginPage, RegisterPage, ForgotPasswordPage,
│   │                     ResetPasswordPage, OAuthCallbackPage
│   ├── dashboard/        (stub)
│   ├── customers/        (stub)
│   ├── bills/            (stub)
│   ├── settings/         (stub)
│   └── portal/           (stub)
└── main.tsx

supabase/
├── config.toml
├── migrations/           NNNN_*.sql
└── functions/
    └── admin-create-user/index.ts

.github/workflows/keepalive.yml
vercel.json
.env.example
```

Dependency direction: pages → feature components → hooks/queries/mutations →
repositories (data access) → Supabase client. UI components in `shared/ui`
contain no domain logic or Supabase calls.

---

## 7. Database schema

All tables: `id uuid primary key default gen_random_uuid()` unless noted,
`created_at timestamptz not null default now()`, `updated_at timestamptz not
null default now()` (touched by trigger), and `deleted_at timestamptz` for
soft delete unless noted. All foreign keys `on delete restrict` unless noted.

### 7.1 Lookup / config tables

**`user_types`** — seeded, no write API
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| key | text unique not null | `admin_member` \| `employee` \| `customer` |
| label | text not null | |
| sort_order | int not null | |

**`bill_statuses`** — seeded, no write API, not editable by anyone
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| key | text unique not null | `pending` \| `active` \| `completed` \| `paid` |
| label | text not null | |
| sort_order | int not null | |
| is_terminal | boolean not null default false | `completed`, `paid` = true |

**`organization_settings`** — exactly one row
| column | type | notes |
|---|---|---|
| id | boolean pk default true | `check (id = true)` — single-row guard |
| org_name | text not null default `'ONEVO'` | |
| currency_code | text not null default `'LKR'` | ISO 4217 |
| currency_locale | text not null default `'en-LK'` | |
| default_bill_status_id | uuid not null → bill_statuses | seeded to `pending` |
| logo_path | text | storage path, nullable |
| updated_by | uuid → profiles | |
| updated_at | timestamptz not null default now() | |

### 7.2 Users

**`profiles`** — 1:1 with `auth.users`
| column | type | notes |
|---|---|---|
| id | uuid pk → auth.users(id) on delete cascade | |
| user_type_id | uuid not null → user_types | |
| full_name | text not null default `''` | |
| email | text not null | mirror of auth email |
| phone | text | |
| status | text not null default `'active'` | `check in ('active','invited','disabled')` |
| created_by | uuid → profiles | null for self-registration |
| created_at / updated_at / deleted_at | | |

**`customers`** — extra fields for `customer`-type profiles
| column | type | notes |
|---|---|---|
| profile_id | uuid pk → profiles(id) on delete cascade | |
| company_name | text | |
| address_line | text | |
| city | text | |
| notes | text | |
| created_by | uuid → profiles | |
| created_at / updated_at / deleted_at | | |

### 7.3 Workflow & order types

**`workflow_templates`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null | |
| description | text | |
| is_active | boolean not null default true | |
| created_by | uuid → profiles | |
| created_at / updated_at / deleted_at | | |

**`workflow_stages`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| template_id | uuid not null → workflow_templates on delete cascade | |
| name | text not null | |
| sort_order | int not null | |
| color | text not null default `'#5A7BFF'` | hex token |
| is_final | boolean not null default false | |
| created_at / updated_at / deleted_at | | |

Constraint: `unique (template_id, sort_order) deferrable initially deferred`
(to allow reordering in one transaction).

**`order_types`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null | |
| workflow_template_id | uuid not null → workflow_templates | |
| fixed_amount | numeric(12,2) | nullable; admin-set default charge |
| is_active | boolean not null default true | |
| created_by | uuid → profiles | |
| created_at / updated_at / deleted_at | | |

### 7.4 Bills

**`bills`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| bill_number | text unique not null | `INV-000123`, set by trigger from a sequence |
| customer_id | uuid not null → profiles(id) | must be a `customer`-type profile (enforced by trigger/check function) |
| bill_status_id | uuid not null → bill_statuses | defaults to `organization_settings.default_bill_status_id` |
| order_date | date not null default current_date | |
| deadline | date | |
| notes | text | |
| created_by | uuid → profiles | |
| created_at / updated_at / deleted_at | | |

**`bill_rows`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| bill_id | uuid not null → bills on delete cascade | |
| sort_order | int not null default 0 | |
| detail | text not null default `''` | |
| order_type_id | uuid → order_types | nullable; if set, row is a tracked order |
| amount | numeric(12,2) not null default 0 | may be negative (discount) |
| current_stage_id | uuid → workflow_stages | set when `order_type_id` is set; defaults to first stage of the type's workflow (trigger) |
| created_at / updated_at / deleted_at | | |

**`order_status_history`** — append-only, no soft delete
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| bill_row_id | uuid not null → bill_rows on delete cascade | |
| from_stage_id | uuid → workflow_stages | null on first entry |
| to_stage_id | uuid not null → workflow_stages | |
| changed_by | uuid → profiles | |
| note | text | |
| created_at | timestamptz not null default now() | |

**`bill_comments`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| bill_id | uuid not null → bills on delete cascade | |
| author_id | uuid not null → profiles | |
| body | text not null | |
| created_at / deleted_at | | no updated_at |

### 7.5 Attachments (schema now, UI Phase 4)

**`attachments`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| owner_type | text not null | `check in ('bill','bill_row')` |
| owner_id | uuid not null | id of the bill or bill_row |
| storage_path | text not null | path within the `attachments` bucket |
| file_name | text not null | |
| mime_type | text | |
| size_bytes | bigint | |
| uploaded_by | uuid → profiles | |
| created_at / deleted_at | | |

Private Storage bucket `attachments`; access via signed URLs from the app.

### 7.6 Audit

**`audit_logs`** — append-only, no soft delete
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| actor_id | uuid → profiles | null for system |
| action | text not null | e.g. `create`, `update`, `delete`, `status_change`, `login` |
| entity_type | text not null | table name |
| entity_id | uuid | |
| metadata | jsonb not null default `'{}'` | |
| created_at | timestamptz not null default now() | |

Written by `security definer` triggers on the mutable tables (create / update /
soft-delete) and by the stage-advance function (`status_change`).

### 7.7 Functions & triggers

| Name | Purpose |
|---|---|
| `handle_new_auth_user()` | AFTER INSERT on `auth.users` → insert `profiles` row. Reads `raw_user_meta_data->>'user_type'` (default `customer`) and `->>'created_by'`. If type = `customer`, also insert a `customers` row. |
| `set_updated_at()` | BEFORE UPDATE → `new.updated_at = now()`. |
| `set_bill_number()` | BEFORE INSERT on `bills` → `'INV-' || lpad(nextval('bill_number_seq')::text, 6, '0')`. |
| `set_default_bill_status()` | BEFORE INSERT on `bills` → fill `bill_status_id` from settings if null. |
| `init_bill_row_stage()` | BEFORE INSERT/UPDATE on `bill_rows` → when `order_type_id` set and `current_stage_id` null, set to first stage (min `sort_order`) of that type's workflow. |
| `assert_customer_profile()` | BEFORE INSERT/UPDATE on `bills` → raise if `customer_id` is not a `customer`-type profile. |
| `advance_bill_row_stage(row_id, to_stage_id, note)` | `security definer` RPC — validates caller is staff, updates `current_stage_id`, inserts `order_status_history` + `audit_logs`. Used from Phase 4. |
| `audit_row_change()` | `security definer` — generic create/update/soft-delete logging. |
| Permission helpers | `current_profile()`, `current_user_type()` → text, `is_staff()` → boolean, `is_admin()` → boolean. `security definer`, `stable`. |

---

## 8. RLS policies

RLS enabled on every table. Reads additionally require `deleted_at is null`
(except append-only tables). Summary:

| Table | `admin_member` | `employee` | `customer` |
|---|---|---|---|
| user_types | read | read | read |
| bill_statuses | read | read | read |
| organization_settings | read + **write** | read | read |
| profiles | read all; write all | read all | read + update **own** |
| customers | read + write all | read + write all | read **own** |
| workflow_templates | read + **write** | read | — |
| workflow_stages | read + **write** | read | — |
| order_types | read + **write** | read | — |
| bills | read + write all | read + write all | read where `customer_id = auth.uid()` |
| bill_rows | read + write all | read + write all | read where parent bill is theirs |
| order_status_history | read + insert (via RPC) | read + insert (via RPC) | read where parent bill is theirs |
| bill_comments | read + write all | read + write all | read + **insert** where parent bill is theirs |
| attachments | read + write all | read + write all | read where parent bill is theirs |
| audit_logs | **read** | — | — |

`employee` = `is_staff()` true, `is_admin()` false. Since Phase 1 ships no
employee accounts, employee policies are written now but exercised later.

Storage bucket `attachments`: policy mirrors the `attachments` table — staff
full; customer read on paths belonging to their own bills (path convention
`bill/<bill_id>/...` checked against ownership).

---

## 9. Seed data

Applied as a migration:

- `user_types`: `admin_member`, `employee`, `customer`.
- `bill_statuses`: `pending`, `active`, `completed` (terminal), `paid` (terminal).
- `organization_settings`: one row, `LKR` / `en-LK`, `default_bill_status_id` → `pending`.
- **No** workflow templates, stages, or order types (admin creates these).
- First `admin_member`: created manually via the Supabase dashboard after
  deploy (documented in README), or by a one-off seeding note — not committed
  with credentials.

---

## 10. Auth & roles

### Providers & linking
- Supabase Auth: email/password + Google OAuth.
- Enable automatic account linking by verified email (Supabase Auth settings).
  First method used owns the account; the second links to it.

### Sign-up paths
1. **Customer self-registration** (`/register`): email/password or Google.
   Email confirmation ON. Trigger creates `profiles` (type `customer`) +
   `customers` row.
2. **Admin-created user**: admin form → Edge Function `admin-create-user`
   (service role). The function verifies the caller is `admin_member`, calls
   `auth.admin.createUser({ email_confirm: true, user_metadata: { user_type,
   created_by } })`. User changes their password later from profile settings.

### App wiring
- `core/supabase/client.ts` — singleton browser client.
- `providers/AuthProvider.tsx` — `{ session, profile, loading }`; subscribes to
  `onAuthStateChange`; loads the `profiles` row (joined `user_types.key`).
- `core/permissions/permissions.ts` — `isAdmin`, `isStaff`, `isCustomer`
  (UI gating only; RLS is the real boundary).

### Routing guards
- `ProtectedRoute` — no session → `/login`.
- `RoleRoute` — staff routes redirect `customer` → `/portal`; portal routes
  redirect staff → `/`.
- `/auth/callback` — completes OAuth.
- `/forgot-password` → reset email → `/reset-password`.

---

## 11. App shell

### Route groups
| Group | Paths | Phase 1 deliverable |
|---|---|---|
| Public | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` | fully built |
| Staff | `/`, `/bills`, `/customers`, `/settings` | layout + route + placeholder body |
| Customer | `/portal`, `/portal/bills/:id` | layout + route + placeholder body |

### Layouts
- `AuthLayout` — centered card, glassmorphic background (from prototype `LoginPage`).
- `AppLayout` (staff) — desktop `Sidebar` + `TopBar`; mobile `MobileBottomBar`.
- `PortalLayout` (customer) — top bar + minimal nav, no admin sidebar.

### State & providers
- `QueryProvider` — TanStack Query with default `retry`, `staleTime`.
- `uiStore` (Zustand) — sidebar open/close, active modal.
- Neo design tokens ported to `src/index.css`. `Card`, `PrimaryButton`,
  `StatusBadge`, `Modal`, `Toast` ported to typed `shared/ui` components.
- `supabase gen types typescript` → `core/supabase/database.types.ts`.

### Responsive
Mobile is a first-class target (matches prototype): breakpoints < 768 mobile,
768–1024 tablet, > 1024 desktop; touch targets ≥ 44px; staff layout uses the
mobile bottom bar under 768px.

---

## 12. Deployment & keep-alive

### Supabase
- Create free project. `supabase link`; `supabase db push` applies all migrations.
- Auth: add Google OAuth credentials; set redirect URLs (localhost + Vercel
  domain); enable automatic account linking; email confirmations ON.
- Deploy `admin-create-user` Edge Function.
- Create private `attachments` storage bucket + policies.

### Vercel
- Import repo, preset **Vite**. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `vercel.json` — SPA rewrite: all paths → `/index.html`.
- `.env.example` committed; `.env.local` for local dev.

### Keep-alive (7-day pause mitigation)
1. **Primary — GitHub Actions cron.** `.github/workflows/keepalive.yml`, cron
   `0 6 */3 * *` (every 3 days). Step: `curl` a real REST read
   (`$SUPABASE_URL/rest/v1/bill_statuses?select=id&limit=1`, `apikey` header
   from a repo secret). A DB hit resets the inactivity timer.
   Note: GitHub disables scheduled workflows after 60 days with no repo
   activity — not an issue for an active project.
2. **Backup — UptimeRobot** pinging the Vercel URL (keeps the site warm; does
   **not** hit Supabase, so the cron above is the real safeguard).
3. **Fallback — manual restore.** Documented in `README.md`: Supabase
   dashboard → project → Restore (~1–2 min, data retained, keys unchanged).

---

## 13. Testing (Phase 1 scope)

- Vitest + RTL configured with a jsdom setup file.
- Smoke tests:
  - `permissions.ts` — `isAdmin` / `isStaff` / `isCustomer` truth table.
  - `RoleRoute` / `ProtectedRoute` — redirect behavior for null session,
    customer-on-staff-route, staff-on-portal-route.
- No E2E in Phase 1 (Playwright deferred).

---

## 14. Definition of done (Phase 1)

- [ ] `npm run dev` serves the app; `npm run build` and typecheck pass; lint passes.
- [ ] Supabase migrations apply cleanly from zero; generated types committed.
- [ ] All tables, RLS policies, functions/triggers, and seed data present and
      verified with a manual RLS check (staff vs customer visibility).
- [ ] Customer can self-register (email/password and Google), receive
      confirmation, and land on `/portal`.
- [ ] Admin can create a user via the Edge Function; created user can log in
      and change their password.
- [ ] Staff user lands on `/`; visiting `/portal` redirects to `/`; customer
      visiting `/` redirects to `/portal`.
- [ ] Placeholder pages render in the correct layout on desktop and mobile.
- [ ] Deployed to Vercel; env vars set; OAuth redirect works on the live domain.
- [ ] Keep-alive workflow runs green on manual dispatch.
- [ ] README documents setup, env vars, and the Supabase restore fallback.
- [ ] Smoke tests pass in CI (or locally if CI test job deferred).

---

## 15. Assumptions & open questions

**Assumptions**
- Single currency for the whole app (no per-bill currency).
- Bill status is a fixed 4-value set; no admin editing, ever.
- `customer_id` on `bills` references `profiles.id` directly (a customer is a
  profile); `customers` holds only the extra fields. The "must be a
  customer-type profile" rule is enforced by the `assert_customer_profile()`
  trigger, not a CHECK constraint — a direct DB console edit or a future
  migration could bypass it; acceptable for a single-tenant app with a small
  trusted staff.
- One first `admin_member` is created out-of-band via the Supabase dashboard.
- Email confirmation is ON for self-registration; admin-created users are
  auto-confirmed.

**Open questions (not blocking Phase 1 build; revisit before later phases)**
- Do employees, when introduced, get a separate `employees` detail table (like
  `customers`) or just a `profiles` row? (Leaning: `profiles` only unless
  employee-specific fields appear.)
- Should `bill_comments` support attachments / be visible to the customer
  selectively, or are all comments on a bill visible to that customer?
  (Current: all visible.)
- Attachment path/ownership convention for Storage RLS — confirm
  `bill/<bill_id>/...` and `bill_row/<row_id>/...` when Phase 4 starts.
