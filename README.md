# ONEVO

Single-tenant **order management + light CRM** for a small business. One business
owner (admin) configures order types and workflows; customers sign in to track
their orders and bills.

React + TypeScript + Vite · Supabase (Auth / Postgres / RLS / Storage) ·
TanStack Query · Zustand · React Router · Tailwind CSS v4.

- Design spec: `docs/superpowers/specs/2026-09-01-onevo-foundation-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-09-01-onevo-phase-1-foundation.md`

---

## Prerequisites

- Node 20+ and npm
- Docker Desktop (for the local Supabase stack)
- Supabase CLI (`scoop install supabase` on Windows)

## Local setup

```bash
npm install
supabase start
cp .env.example .env.local     # fill in the values printed by `supabase start`
npm run dev
```

`.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from `supabase start`>
```

Local services: API `:54321` · DB `:54322` · Studio `:54323` · Mail (Mailpit) `:54324`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | oxlint |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:e2e:ui` | Playwright in interactive UI mode |

## End-to-end tests (Playwright)

`e2e/` holds browser tests that run the real app against the local Supabase
stack. **Docker + `supabase start` must be running first.**

```bash
npm run test:e2e
```

What happens on each run:

1. `e2e/global-setup.ts` runs `supabase db reset` (clean schema + the 3 seeded
   logins) and seeds one workflow + order type fixture.
2. `e2e/auth.setup.ts` signs in as admin / staff / customer once and saves
   `e2e/.auth/*.json` session state that the specs reuse.
3. A single Chromium worker runs the specs: auth redirects, bill creation +
   totals + status + payment, stage advancement with history, the customer
   portal (read-only view + posting a comment), file upload, and a realtime
   check (a staff comment appears on the customer's open page with no reload).

Playwright starts its own dev server on port **5199**; it reuses an existing one
if present. Traces/screenshots for failures land in `test-results/`. CI wiring
is not included — a CI job would need Docker + the Supabase CLI on the runner.

## Database

Migrations live in `supabase/migrations/` and apply in filename order:

- `0001_core_schema.sql` — all tables (every phase)
- `0002_functions_triggers.sql` — permission helpers, triggers, `advance_bill_row_stage` RPC
- `0003_rls_policies.sql` — RLS + storage policies
- `0004_seed.sql` — user types, bill statuses, organization settings

```bash
supabase db reset                                              # re-apply everything + seed
supabase gen types typescript --local > src/core/supabase/database.types.ts   # after any schema change
```

SQL smoke tests (run against a reset DB):

```bash
docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/schema.test.sql
docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/seed.test.sql
docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/triggers.test.sql
docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/rls.test.sql
docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/rpc.test.sql
```

## Edge function

`supabase/functions/admin-create-user/` — an authenticated `admin_member`
creates a user with a temporary password (runs with the service role, verifies
the caller first).

```bash
supabase functions serve admin-create-user     # local
supabase functions deploy admin-create-user    # hosted
```

## First admin user

The signup form only creates `customer` accounts. To make the first admin:

1. Supabase Studio → **Authentication → Add user** (email + password, tick
   "Auto Confirm User").
2. Studio → **Table Editor → `profiles`** → set that row's `user_type_id` to the
   `admin_member` id from `user_types`.

After that, an admin can create more users through the `admin-create-user`
function.

## Deployment (Vercel)

1. Create a Supabase project; `supabase link` then `supabase db push` to apply
   the migrations. Deploy the edge function.
2. Supabase → **Authentication → Providers → Google**: add the OAuth client id +
   secret (create them in Google Cloud Console; authorized redirect URI is
   `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Supabase → **Authentication → URL Configuration**: set the Site URL and add
   redirect URLs for `http://localhost:5173` and the Vercel domain.
4. Supabase → **Authentication**: enable **automatic account linking** (so a
   Google sign-in links to an existing email/password account with the same
   verified email) and turn **email confirmations ON** for self-registration.
5. Import the repo into Vercel (framework preset **Vite**). Set env vars
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `vercel.json` already
   rewrites all routes to `index.html`.

> Vercel Hobby (free) is non-commercial. Move to Pro if this becomes a paid
> product.

## Supabase free-tier pause

A free project **pauses after 7 days with no activity** — the keys don't change
and data isn't lost, but every request fails until you restore it.

- **Primary:** `.github/workflows/keepalive.yml` pings the REST API every 3 days.
  Add repo secrets `SUPABASE_URL` (e.g. `https://<ref>.supabase.co`) and
  `SUPABASE_ANON_KEY`. GitHub disables scheduled workflows after 60 days of repo
  inactivity — a push or a manual run re-enables it.
- **Backup:** point UptimeRobot / cron-job.org at the Vercel URL (keeps the site
  warm; does not hit Supabase, so the cron above is the real safeguard).
- **If it pauses anyway:** Supabase dashboard → project → **Restore**
  (~1–2 minutes; data retained; keys unchanged).
