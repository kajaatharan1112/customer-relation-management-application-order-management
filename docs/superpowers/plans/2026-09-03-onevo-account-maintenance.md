# ONEVO Account Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠ **This plan is built on a DRAFT spec.** Every ⚠ open decision in the spec has been resolved here with a **provisional ruling** (see "Rulings baked into this plan" below). Confirm those with the human before executing. This feature performs **irreversible bulk deletion of business data** — do not skip the safety steps.

**Goal:** An admin-only "Account maintenance" Settings section that shows storage/row usage, exports old completed bills + their documents + history to a downloadable **ZIP of PDFs**, and — only after a verified export — **permanently purges** that data with a type-to-confirm gate and an audit-log entry.

**Architecture:** A `features/maintenance/` module (Supabase only in `data/`). A migration adds an `export_tokens` table, a `maintenance_stats()` RPC, and a `purge_archived_data(p_before, p_token)` RPC (`security definer`, `is_admin()` check, FK-safe delete, returns removed storage paths + counts). Export is **client-side**: the admin's browser fetches eligible bills, renders one PDF per bill (`@react-pdf/renderer`), bundles raw attachments + an `index.pdf` into a ZIP (`jszip`), records an `export_tokens` row, and offers the ZIP via an `<a download>`. Purge calls the RPC then removes the returned storage paths via `supabase.storage.remove`.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tailwind v4 neo tokens, lucide-react, Vitest + Testing Library, Supabase (Postgres + pgTAP), **new deps `jszip` + `@react-pdf/renderer`**.

**Spec:** `docs/superpowers/specs/2026-09-03-onevo-account-maintenance-design.md`

## Rulings baked into this plan (provisional — veto before executing)

| Spec ⚠ | Ruling | Cost if wrong |
|---|---|---|
| ⚠1 what is purgeable | `bills` + `bill_rows` + `order_status_history` + `bill_comments` + `attachments` (+ their Storage objects) for bills past the cut-off. `customers`, `workflow_templates`, `workflow_stages`, `order_types` are **never** purged. | Re-scope the RPC's delete list + stats query. |
| ⚠2 retention cut-off | Default: `order_date < today − 12 months` **AND** the bill's status bucket is `done`. The admin may override the date in the modal, clamped to **≥ 18 months ago** (cannot purge anything younger than 18 months). | Change one constant + one clamp. |
| ⚠3 PDF mechanism | **Client-side** — `@react-pdf/renderer` per bill, `jszip` bundle, `<a download>`. No Edge Function for export. | Rework Task 5–6 into an Edge Function; the DB/UI tasks are unaffected. |
| ⚠4 attachments | Raw files in the ZIP at `attachments/<bill_number>/<filename>`; the bill PDF lists them by name. Not embedded. | Change the ZIP-assembly loop only. |
| ⚠5 export↔purge coupling | `export_tokens` row per export: `covers_before date`, `consumed_at`. Purge requires a token with `covers_before >= p_before`, `consumed_at is null`, `created_at > now() − 24h`. Single-use (RPC sets `consumed_at`). | Change the token check in the RPC + the UI gate. |
| ⚠6 storage deletion | Two-step: `purge_archived_data` deletes DB rows and **returns** `text[]` of storage paths; the client then `supabase.storage.from('attachments').remove(paths)`. The RPC does not touch `storage.objects`. | Move the storage delete into the RPC (needs `storage` schema access from `security definer`). |
| ⚠7 history view | Safe — only `done` bills ≥ 12 months old are purged; `0007`'s history view only joins live rows. Noted, no code. | — |
| ⚠8 audit shape | One `audit_logs` insert: `{ action: 'purge_archived_data', before_date, counts: { bills, bill_rows, comments, attachments }, storage_removed: <int> }`. | Change one JSON literal. |

---

## Global Constraints

- **Do NOT run git.** End each task with `ready to commit: <msg>`; the user commits.
- Supabase access only in `features/maintenance/data/maintenance.repository.ts`.
- camelCase VMs; snake_case DB rows until mapped.
- Neo tokens only; no new colours (danger surfaces reuse `--color-neo-danger`).
- Tests colocated `*.test.ts(x)`; `vi.hoisted` + `vi.mock` for Supabase, per `bill.repository.test.ts`.
- Definition of done per task: `npm run test` green, `npm run typecheck` clean, `npm run lint` clean (3 pre-existing warnings only). For DB tasks: `supabase db reset` applies the migration and the pgTAP file passes.
- **Modifies `supabase/` by ADDING only:** `migrations/00XX_account_maintenance.sql`, `tests/account_maintenance.test.sql`. (No Edge Function — ruling ⚠3.) Never edit `0001`–`0009`.
- **Every destructive path** ships behind: (a) a verified `export_tokens` row, (b) a type-"PURGE" modal, (c) `is_admin()` server check, (d) one `audit_logs` row. No task removes data without all four.
- `lucide-react@1.38`: `DatabaseZap`, `Download`, `Trash2`, `AlertTriangle`, `HardDrive`. Substitute nearest + note if missing.
- Effort A (`…-settings-access-member-management`) SHOULD ship first — this section lives under the admin-only `/settings` it establishes. If A is not yet merged, wrap this section's route access check locally on `isAdmin`.

---

## File Structure

```
src/features/maintenance/
├── maintenance.types.ts                              (create)
├── maintenance.retention.ts / .test.ts               (create) pure cut-off + eligibility helpers
├── data/maintenance.repository.ts / .test.ts         (create) stats | recordExport | purge
├── data/exportArchive.ts / .test.ts                  (create) client PDF+ZIP builder (pure-ish, DI'd)
├── queries/useMaintenanceStats.ts                    (create)
├── mutations/useMaintenanceActions.ts                (create) useRunExport | usePurge
└── components/
    ├── AccountMaintenanceSection.tsx / .test.tsx     (create)
    └── PurgeConfirmModal.tsx / .test.tsx             (create) type-"PURGE" gate
src/features/settings/SettingsPage.tsx / .test.tsx    (modify) rename tab + SECTIONS row + section
package.json                                          (modify) + jszip + @react-pdf/renderer
supabase/migrations/00XX_account_maintenance.sql      (create)
supabase/tests/account_maintenance.test.sql          (create)
e2e/account-maintenance.spec.ts                       (create)
```

---

## Task 1: Deps + `maintenance.retention.ts` (pure eligibility)

**Files:**
- Modify: `package.json`
- Create: `src/features/maintenance/maintenance.types.ts`
- Create: `src/features/maintenance/maintenance.retention.ts` + `.test.ts`

**Interfaces:**
- Produces:
  - `interface PurgeStats { bills: number; billRows: number; comments: number; attachments: number; storageBytes: number }`
  - `interface MaintenanceStatsVM { total: PurgeStats; eligible: PurgeStats; cutoff: string }` (`cutoff` = `YYYY-MM-DD`)
  - `interface ExportToken { token: string; coversBefore: string; createdAt: string }`
  - `defaultCutoff(today?: Date): string` — `today − 12 months`, `YYYY-MM-DD`.
  - `clampCutoff(date: string, today?: Date): string` — not later than `today − 18 months`.
  - `isBillEligible(bill: { orderDate: string; statusKey: string }, cutoff: string): boolean` — `bucketOf(statusKey) === 'done' && orderDate.slice(0,10) < cutoff`.

- [ ] **Step 1: Install deps** — `npm install jszip @react-pdf/renderer`. Expected: both under `dependencies`; peer-dep React warnings acceptable, errors not.

- [ ] **Step 2: Write the failing test** `maintenance.retention.test.ts`

```ts
import { defaultCutoff, clampCutoff, isBillEligible } from '@/features/maintenance/maintenance.retention'

const today = new Date('2026-09-03T12:00:00')

it('defaultCutoff is 12 months back', () => {
  expect(defaultCutoff(today)).toBe('2025-09-03')
})
it('clampCutoff cannot exceed 18 months back', () => {
  expect(clampCutoff('2026-06-01', today)).toBe('2025-03-03')     // clamped
  expect(clampCutoff('2024-01-01', today)).toBe('2024-01-01')     // already older -> unchanged
})
it('isBillEligible: done + older than cutoff', () => {
  const c = '2025-09-03'
  expect(isBillEligible({ orderDate: '2025-01-01', statusKey: 'completed' }, c)).toBe(true)
  expect(isBillEligible({ orderDate: '2026-01-01', statusKey: 'completed' }, c)).toBe(false) // too new
  expect(isBillEligible({ orderDate: '2024-01-01', statusKey: 'pending' }, c)).toBe(false)   // not done
})
```

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- maintenance.retention`)

- [ ] **Step 4: Implement** `maintenance.types.ts` (the interfaces above) and `maintenance.retention.ts`:

```ts
import { bucketOf } from '@/shared/constants/billStatus'

function shiftMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate())
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function defaultCutoff(today: Date = new Date()): string {
  return ymd(shiftMonths(today, -12))
}
export function clampCutoff(date: string, today: Date = new Date()): string {
  const max = ymd(shiftMonths(today, -18))
  return date > max ? max : date
}
export function isBillEligible(bill: { orderDate: string; statusKey: string }, cutoff: string): boolean {
  return bucketOf(bill.statusKey) === 'done' && bill.orderDate.slice(0, 10) < cutoff
}
```

- [ ] **Step 5: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: build: maintenance deps + pure retention/eligibility helpers`

---

## Task 2: Migration `00XX` — `export_tokens`, `maintenance_stats()`, `purge_archived_data()`

**Files:**
- Create: `supabase/migrations/0010_account_maintenance.sql` (use the next free number)
- Create: `supabase/tests/account_maintenance.test.sql`

**Interfaces:**
- Produces:
  - `public.export_tokens (id uuid pk default gen_random_uuid(), created_by uuid, created_at timestamptz default now(), covers_before date not null, consumed_at timestamptz)` — RLS: `is_admin()` for all.
  - `public.maintenance_stats(p_before date) returns jsonb` — `{ total: {...}, eligible: {...} }` row/byte counts; `stable security definer`; `is_admin()` check.
  - `public.purge_archived_data(p_before date, p_token uuid) returns jsonb` — `security definer`; `is_admin()`; validates the token (`covers_before >= p_before`, `consumed_at is null`, `created_at > now() - interval '24 hours'`); deletes children→parents for eligible `done` bills with `order_date < p_before`; sets `consumed_at`; inserts one `audit_logs` row; returns `{ counts: {...}, storage_paths: text[] }`.

- [ ] **Step 1: Read** `sed -n '1,60p' supabase/migrations/0006_customer_bill_rpcs.sql` and the `bills` / `bill_rows` / `attachments` / `order_status_history` / `bill_comments` schemas in `0001`. Note `attachments` has a `storage_path` column.

- [ ] **Step 2: Write the pgTAP test** `account_maintenance.test.sql`

`plan(7)` covering: non-admin caller → exception on both functions; `maintenance_stats` counts a seeded old-done bill as eligible and a recent one as not; `purge_archived_data` with a valid token deletes the eligible bill + children (no FK error) and returns the right counts; a **second** call with the now-consumed token → exception; a call with `p_before` newer than the token's `covers_before` → exception; an `audit_logs` row exists after a successful purge. Seed a done bill dated 2 years ago in the test's `begin;`.

- [ ] **Step 3: Run — expect FAIL** (`supabase db reset` + pgTAP runner)

- [ ] **Step 4: Write `0010_account_maintenance.sql`** — `create table export_tokens` + RLS; `maintenance_stats` (aggregate `count(*)` / `sum(size_bytes)` joins, split by `p_before`); `purge_archived_data` in a `plpgsql` block: guard `is_admin()`; `select ... into v_token` and validate; `create temp table _doomed as select id from bills where order_date < p_before and deleted_at is distinct from null-or-not ... and status bucket = done` (join `bill_statuses` for the terminal flag — use `bill_statuses.is_terminal`); `delete from order_status_history where bill_id in (select id from _doomed)`; same for `bill_comments`; capture `array_agg(storage_path)` from `attachments where bill_id in (...)` into `v_paths`; `delete from attachments ...`; `delete from bill_rows where bill_id in (...)`; `delete from bills where id in (...)`; `update export_tokens set consumed_at = now() where id = p_token`; `insert into audit_logs (...) values (...)`; `return jsonb_build_object('counts', ..., 'storage_paths', to_jsonb(coalesce(v_paths,'{}')))`. `revoke all ... from public; grant execute ... to authenticated`.

  Use `bill_statuses.is_terminal = true` as the "done" test at the DB layer (the frontend's `bucketOf` maps terminal statuses to `done`; keep the two definitions aligned and note it in a SQL comment).

- [ ] **Step 5: Run the pgTAP — expect PASS** (`7..7`)

- [ ] **Step 6: Ready to commit**

`ready to commit: feat(db): 0010 export tokens + maintenance stats + guarded purge`

---

## Task 3: `maintenance.repository.ts` (stats + purge)

**Files:**
- Create: `src/features/maintenance/data/maintenance.repository.ts` + `.test.ts`

**Interfaces:**
- Produces:
  - `maintenanceRepository.stats(before: string): Promise<MaintenanceStatsVM>` → `rpc('maintenance_stats', { p_before: before })`, maps the jsonb.
  - `maintenanceRepository.recordExport(coversBefore: string): Promise<ExportToken>` → `insert into export_tokens` returning the row (mapped).
  - `maintenanceRepository.purge(before: string, token: string): Promise<{ counts: PurgeStats; storagePathsRemoved: number }>` → `rpc('purge_archived_data', { p_before: before, p_token: token })`, then `supabase.storage.from('attachments').remove(paths)` for the returned `storage_paths`, returns the counts + `paths.length`.

- [ ] **Step 1: Read** `cat src/features/bills/data/bill.repository.test.ts` for the `supabase` mock; add `storage: { from: () => ({ remove: vi.fn() }) }` to it.

- [ ] **Step 2: Write the failing test** — assert `stats` maps the jsonb → VM; `recordExport` inserts and returns `{ token, coversBefore, createdAt }`; `purge` calls the RPC with `{ p_before, p_token }` then `storage.remove(['a/x.png','a/y.pdf'])` and returns `{ counts, storagePathsRemoved: 2 }`; RPC error propagates.

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Implement** the three methods per the interfaces. Map jsonb defensively (`?? 0`).

- [ ] **Step 5: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: maintenance repository (stats / recordExport / purge)`

---

## Task 4: `exportArchive.ts` — client PDF + ZIP builder

**Files:**
- Create: `src/features/maintenance/data/exportArchive.ts` + `.test.ts`

**Interfaces:**
- Consumes: `@react-pdf/renderer` (`pdf`, `Document`, `Page`, `Text`, `View`), `jszip`, a `fetchAttachment(path: string) => Promise<Blob>` injected dependency (so tests don't hit network).
- Produces:
  - `buildBillPdf(bill: ArchiveBill): Promise<Blob>` — a one-bill PDF (number, customer, line items, payments, full stage history list, comment list, attachment filenames).
  - `buildArchiveZip(bills: ArchiveBill[], deps: { fetchAttachment }): Promise<Blob>` — a ZIP: `index.pdf` (manifest: count, date range, per-bill page), `bills/<bill_number>.pdf`, `attachments/<bill_number>/<filename>`.
  - `interface ArchiveBill { billNumber; customerName; orderDate; total; paidAmount; rows: {detail; amount; orderTypeName}[]; history: {stage; at; note}[]; comments: {author; body; at}[]; attachments: {filename; storagePath}[] }`

- [ ] **Step 1: Write the failing test** — with a fake `fetchAttachment` returning a tiny `Blob`, `buildArchiveZip([oneBill], deps)` resolves to a `Blob`; unzip it (`jszip.loadAsync`) and assert `index.pdf`, `bills/BILL-1.pdf`, `attachments/BILL-1/proof.png` entries exist. `buildBillPdf` resolves to a non-empty `Blob`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** — `buildBillPdf` renders a `@react-pdf/renderer` `<Document>` via `pdf(<Doc/>).toBlob()`. `buildArchiveZip` loops bills, `zip.file('bills/'+n+'.pdf', await buildBillPdf(b))`, loops `b.attachments` → `zip.file('attachments/'+n+'/'+a.filename, await deps.fetchAttachment(a.storagePath))`, builds `index.pdf`, `return zip.generateAsync({ type: 'blob' })`.

- [ ] **Step 4: Run — expect PASS**. If `@react-pdf/renderer` won't run under jsdom, mock `pdf().toBlob` in the test to return a stub `Blob` and assert the ZIP structure only (note the deviation in the commit line).

- [ ] **Step 5: `npm run typecheck && npm run lint`**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: client-side archive builder (per-bill PDF + ZIP)`

---

## Task 5: queries + mutations

**Files:**
- Create: `src/features/maintenance/queries/useMaintenanceStats.ts`
- Create: `src/features/maintenance/mutations/useMaintenanceActions.ts`

**Interfaces:**
- Produces:
  - `useMaintenanceStats(before: string)` → `queryKey: ['maintenance-stats', before]`, `queryFn: () => maintenanceRepository.stats(before)`, `staleTime: 60_000`.
  - `useRunExport()` — mutation `(before: string) =>` : fetch eligible bills (`billRepository.list()` filtered by `isBillEligible`) + their detail (`billRepository.get(id)` per bill) + history/comments/attachments, map to `ArchiveBill[]`, `buildArchiveZip`, trigger `<a download="onevo-archive-<before>.zip">`, then `maintenanceRepository.recordExport(before)`; returns the `ExportToken`. `onSuccess` → `invalidateQueries(['maintenance-stats'])`.
  - `usePurge()` — mutation `({ before, token }) => maintenanceRepository.purge(before, token)`; `onSuccess` → `invalidateQueries(['maintenance-stats'])` + `invalidateQueries(['bills'])`.

- [ ] **Step 1: Implement** both files per the interfaces. The `<a download>` trigger: `const url = URL.createObjectURL(zipBlob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)`.

- [ ] **Step 2: Typecheck + lint** (behaviour covered by the section component test in Task 6).

- [ ] **Step 3: Ready to commit**

`ready to commit: feat: maintenance stats query + export/purge mutations`

---

## Task 6: `PurgeConfirmModal` + `AccountMaintenanceSection`

**Files:**
- Create: `src/features/maintenance/components/PurgeConfirmModal.tsx` + `.test.tsx`
- Create: `src/features/maintenance/components/AccountMaintenanceSection.tsx` + `.test.tsx`

**Interfaces:**
- `PurgeConfirmModal({ counts, onCancel, onConfirm }: { counts: PurgeStats; onCancel: () => void; onConfirm: () => void })` — shows what will be deleted; a text input; **Confirm** enabled only when the input is exactly `PURGE`.
- `AccountMaintenanceSection()` — default section body: an overview panel (`useMaintenanceStats`), an **Export** button (`useRunExport`; on success stores the token + shows the download happened), a **Purge** button disabled until a token exists (from this session) whose `coversBefore >= cutoff`, opening `PurgeConfirmModal`.

- [ ] **Step 1: Write the failing tests** — mock `useMaintenanceStats` / `useRunExport` / `usePurge`.
  - `PurgeConfirmModal`: Confirm disabled; type `PURG` → still disabled; type `PURGE` → enabled; click → `onConfirm`.
  - `AccountMaintenanceSection`: overview numbers render; Purge disabled initially; after Export resolves (mock returns a token), Purge enabled; clicking Purge → modal → type PURGE → confirm → `usePurge` mutate called with `{ before, token }`; loading/error states.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** both components (neo cards; danger styling on Purge; `AlertTriangle`). Section holds `token: ExportToken | null` and `cutoff` state (from `defaultCutoff()`, editable via a date input clamped by `clampCutoff`).

- [ ] **Step 4: Run — expect PASS**, `npm run test` (full), `npm run typecheck`, `npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: Account maintenance section + type-PURGE confirm`

---

## Task 7: Settings wiring + e2e

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx` + `.test.tsx`
- Create: `e2e/account-maintenance.spec.ts`

- [ ] **Step 1** — In `SECTIONS` add `{ key: 'maintenance', title: 'Account maintenance', description: 'Export old data to PDF, then free up storage', icon: DatabaseZap }`. Widen `Tab`. Section view renders `<AccountMaintenanceSection />` under the back pill + an `<h1>Account maintenance</h1>`.

- [ ] **Step 2** — `SettingsPage.test.tsx`: mock the maintenance hooks; assert the menu shows the "Account maintenance" row and clicking it renders the section heading + an Export control.

- [ ] **Step 3** — `e2e/account-maintenance.spec.ts` (admin storageState): open `/settings` → Account maintenance; assert the overview renders; click **Export** and assert a download is triggered (Playwright `page.waitForEvent('download')`); assert **Purge** becomes enabled; open the modal, type `PURGE`, confirm; assert the overview's "eligible" counts drop to 0. Use a DB seeded with one old done bill (extend `e2e/global-setup.ts`'s fixture SQL, or create+age one in the test via an RPC — simplest: add one `bills` row dated 2 years ago with a terminal status in the fixture block).

- [ ] **Step 4** — `npm run test && npm run typecheck && npm run lint` green; `npx playwright test account-maintenance` green; then full `npx playwright test`.

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: Account maintenance Settings section + e2e`

---

## Self-Review (completed during planning)

**1. Spec coverage:** rename tab (T7) · usage overview (T2 stats RPC, T6 panel) · export→PDF→ZIP (T4 builder, T5 mutation) · purge gated on export token (T2 RPC, T5/T6) · type-PURGE modal (T6) · audit row (T2) · migration (T2) · pgTAP (T2) · tests incl. e2e (every task, T7). Edge Function `maintenance-export` from the spec is **not** built — ruling ⚠3 chose client-side; noted in the header.

**2. Placeholder scan:** the SQL in Task 2 Step 4 is described procedurally, not with `TBD` — the exact delete order and the `is_terminal` alignment are specified. Task 4 Step 4 names a concrete jsdom fallback. No "similar to Task N".

**3. Type consistency:** `PurgeStats` / `MaintenanceStatsVM` / `ExportToken` / `ArchiveBill` defined in T1/T4 and consumed unchanged in T3/T5/T6. RPC names `maintenance_stats` / `purge_archived_data` and params `p_before` / `p_token` consistent between T2 (SQL + pgTAP) and T3 (repo). `export_tokens` columns consistent between T2 and T3's `recordExport`.
