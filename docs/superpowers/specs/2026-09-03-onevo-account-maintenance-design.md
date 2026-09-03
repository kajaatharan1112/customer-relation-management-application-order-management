# ONEVO — Account Maintenance Design Spec (Effort B)

**Document type:** Design specification
**Date:** 2026-09-03
**Status:** DRAFT — several decisions still open (marked ⚠). Do NOT turn into a plan
until the ⚠ items are settled with the user.
**Part of:** the 3-way split. Sibling specs: `…-settings-access-member-management-design.md`
(A, ships first), `…-home-cms-page-design.md` (C). **B ships last** — it is destructive.

---

## 1. Context

The old "Account" Settings tab is replaced by **"Account maintenance"** — one place to keep
the Supabase project lean: **export old data (bills, documents, order history) to PDF, then
purge it** so Storage and the database don't grow forever.

Today nothing deletes data permanently. `deleted_at` marks soft-deleted rows on 9 tables
(`bills`, `bill_rows`, `customers`, `workflow_templates`, `workflow_stages`, `order_types`,
`attachments`, …); soft-deleted rows and their Storage objects accumulate indefinitely.
Attachments live in the `attachments` Storage bucket.

**This feature performs irreversible bulk deletion of the user's own business data.** The
spec must make every deletion explicit, gated, logged, and preceded by a verified export.

---

## 2. Scope

### In scope

1. Rename the Settings section from "Account" to **"Account maintenance"**; icon
   `DatabaseZap` (or `HardDriveDownload`). Admin-only (inherits Effort A's `/settings`
   gate).
2. A **usage overview** panel: row counts + approximate storage bytes for the purgeable
   entities (bills and their children, attachments/Storage, order history, comments),
   split into "within retention" vs "eligible to purge". Read-only, from a
   `maintenance_stats` RPC / view.
3. An **Export** action: produce a downloadable archive of the *eligible* data as **PDF**
   (one PDF per bill: header, customer, line items, payments, full stage history, comment
   thread; attachments either embedded when image/PDF or listed with a note), bundled into
   a single **ZIP** with an `index.pdf` manifest. Delivered as a time-limited signed
   download URL. Nothing is deleted by Export.
4. A **Purge** action, enabled only after a successful Export in the same session
   (server-enforced via an export token): hard-deletes the exported rows + their Storage
   objects, writes one `audit_logs` entry summarising what was removed. Requires a
   type-to-confirm ("PURGE") modal.
5. **Retention rule** (⚠ decision): default "older than **12 months** by `bills.order_date`,
   and the bill's bucket is `done` (completed/paid/delivered), and it is not already
   soft-deleted-recently". Purge also always includes rows already soft-deleted more than
   30 days ago regardless of age.
6. DB migration `00XX_account_maintenance.sql` — `maintenance_stats` view/RPC;
   `purge_archived_data(p_before date, p_export_token uuid)` RPC (`security definer`,
   `is_admin()` check, validates the token, deletes in FK-safe order, returns a summary
   JSON); an `export_tokens` table (`id uuid`, `created_by`, `created_at`, `covers_before
   date`, `consumed_at`).
7. Edge Function `maintenance-export` — builds the ZIP-of-PDFs server-side, uploads it to a
   private `exports` Storage bucket, inserts an `export_tokens` row, returns
   `{ token, download_url }`. Edge Function `maintenance-purge` is **not** needed — Purge is
   the `purge_archived_data` RPC called from the client (the RPC also removes Storage
   objects via `storage.objects` deletes / the storage API from within the function, ⚠
   confirm mechanism).
8. `features/maintenance/` module: `data/maintenance.repository.ts` (stats, export, purge),
   `queries/useMaintenanceStats.ts`, `mutations/useMaintenanceActions.ts`,
   `AccountMaintenancePage`/section component with the overview + Export + Purge cards and
   the confirm modal.
9. Tests — §5.

### Out of scope

- Automatic/scheduled purging (this is a manual admin action only).
- Selective / hand-picked export (v1 is "everything older than the cut-off").
- Exporting customers or settings config (only transactional data + documents).
- Restoring from an export (the ZIP is the backup; re-import is not built).
- Storage-tier / bucket lifecycle config on the Supabase side.
- Effort A, Effort C.

---

## 3. Open decisions (⚠ — settle before planning)

1. **What exactly is purgeable?** Proposed: `bills` + `bill_rows` + `order_status_history` +
   `bill_comments` + `attachments` (+ their Storage objects) for bills past the retention
   cut-off. Customers, workflows, order types are **never** purged (they're config /
   ongoing). Confirm.
2. **Retention cut-off.** Fixed "older than 12 months by `order_date` and bucket = done"?
   Or admin-chosen date in the modal? Or both (default + override)?
3. **PDF generation.** Server-side in the Edge Function (needs a Deno-compatible PDF lib —
   e.g. `pdf-lib`) is the recommendation; heavier to build but scales and keeps the client
   thin. Alternative: client-side (`@react-pdf/renderer` or print-to-PDF per bill) — simpler
   to start, bad for hundreds of bills. Pick one.
4. **Attachments in the PDF.** Embed images/PDFs inline (bigger archive, self-contained) vs
   list filename + a copy of the raw file alongside in the ZIP. Recommendation: raw files
   in the ZIP under `attachments/<bill_number>/`, referenced from the bill PDF.
5. **Purge ↔ export coupling.** Proposed: Purge is only allowed against an `export_token`
   whose `covers_before` ≥ the purge date and `consumed_at is null`, created < 24h ago.
   Confirm the window and single-use semantics.
6. **Storage deletion from SQL.** Can `purge_archived_data` delete `storage.objects` rows
   directly (they're in the `storage` schema, RLS-controlled)? If not, Purge becomes a
   two-step: RPC deletes DB rows + returns the list of storage paths, then the client
   deletes them via `supabase.storage.from('attachments').remove(paths)`. Confirm approach.
7. **Realtime / history view.** `0007_realtime_and_history_view.sql` adds a history view —
   confirm deleting `order_status_history` rows doesn't break it for still-live bills
   (it won't, but note it).
8. **Audit.** One `audit_logs` row per purge with `{ before_date, bills, rows, comments,
   attachments, bytes_freed }`. Confirm shape.

---

## 4. Architecture (once decisions land)

```
src/features/maintenance/
├── maintenance.types.ts
├── data/maintenance.repository.ts (+ .test.ts)    stats | export | purge
├── queries/useMaintenanceStats.ts
├── mutations/useMaintenanceActions.ts
└── components/AccountMaintenanceSection.tsx (+ .test.tsx)
src/features/settings/SettingsPage.tsx              +'maintenance' Tab + SECTIONS row
supabase/
├── migrations/00XX_account_maintenance.sql        maintenance_stats, export_tokens, purge_archived_data
├── functions/maintenance-export/index.ts (+ test) ZIP-of-PDFs -> private `exports` bucket -> token
└── tests/account_maintenance.test.sql             pgTAP: retention selection, token validation, FK-safe delete, non-admin refused
```

**Flow.** Overview: `useMaintenanceStats()` → `maintenance_stats` RPC. Export: mutation →
`maintenance-export` Edge Function → `{ token, download_url }`; the UI shows the download
link and unlocks Purge. Purge: type-"PURGE" modal → `purge_archived_data(before, token)` →
(if needed) client removes returned Storage paths → invalidate stats → success toast with
the summary. Every path re-checks `is_admin()` server-side.

---

## 5. Testing (outline — expand after decisions)

| File | Asserts |
|---|---|
| `maintenance.repository.test.ts` | stats mapping; export posts to the Edge Function and returns the token+url; purge calls the RPC with `(before, token)` and then removes any returned storage paths; errors propagate |
| `AccountMaintenanceSection.test.tsx` | overview numbers render; Purge disabled until an export token exists; type-"PURGE" gate; confirm calls the purge mutation; loading/error |
| `supabase/tests/account_maintenance.test.sql` (pgTAP) | retention query selects only eligible bills; `purge_archived_data` refuses a missing/consumed/expired token; refuses a non-admin caller; deletes children before parents (no FK violation); marks the token consumed; writes one audit row |
| `functions/maintenance-export/index.test.ts` | 401/403 gates; builds a non-empty ZIP; inserts an `export_tokens` row |
| e2e | admin exports (download link appears) → Purge unlocks → type PURGE → confirm → overview counts drop; a fresh session cannot Purge without exporting |

**DoD per stage:** unit + typecheck + lint green; `supabase db reset` applies the migration
and pgTAP passes; e2e green. **No git.**

---

## 6. Delivery — ordered stages (draft)

1. Decisions workshop (resolve §3) → finalise this spec.
2. Migration: `export_tokens`, `maintenance_stats`, `purge_archived_data` + pgTAP.
3. `maintenance-export` Edge Function (PDF/ZIP) + its test + private `exports` bucket
   + policy.
4. `features/maintenance/` data layer + tests.
5. `AccountMaintenanceSection` UI + confirm modal + Settings wiring + tests + e2e.

---

## 7. Constraints

As Effort A §8, plus: **this effort is destructive** — every stage must ship behind a
verified export, a type-to-confirm gate, an `is_admin()` server check, and an `audit_logs`
entry. Nothing here deletes without those four. Do NOT run git.
