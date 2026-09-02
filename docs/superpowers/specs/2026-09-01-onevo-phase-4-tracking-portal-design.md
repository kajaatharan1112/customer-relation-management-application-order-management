# ONEVO — Phase 4 (Tracking + Customer Portal) Design Spec

**Document type:** Design specification
**Date:** 2026-09-01
**Phase:** 4 of 5 (Order-stage tracking, customer portal, comments, attachments, realtime)
**Status:** Draft — awaiting review
**Depends on:** Phases 1–3 (schema, RLS, auth, app shell, settings, customers, bills) — all complete and verified.

---

## 1. Context

Phases 1–3 built the database and every staff-side screen. Phase 4 closes the
loop:

1. **Staff move each order row through its workflow stages** and see the history.
2. **Customers sign in to a portal** and watch their orders/bills progress
   (read-only) and talk to the business.
3. **Comments** — a per-bill thread shared by staff and that bill's customer.
4. **Attachments** — files on a bill, uploadable by staff, downloadable by both.
5. **Realtime** — the portal and the staff bill-detail page update live.

Phase 4 also adds the RLS test coverage flagged since Phase 1 for the
`bill_comments` INSERT policy and the `attachments` storage policy.

### What already exists

- **`advance_bill_row_stage(p_row_id uuid, p_to_stage_id uuid, p_note text)`** —
  `security definer`, staff-only; updates `bill_rows.current_stage_id`, inserts
  `order_status_history` (from/to/changed_by/note) and an `audit_logs`
  `status_change` row. Verified by `supabase/tests/rpc.test.sql`.
- Tables `order_status_history` (append-only), `bill_comments` (soft-delete,
  RLS: staff full; customer read + **insert** on own bills), `attachments`
  (RLS: staff full; customer read on own bills).
- Private Storage bucket **`attachments`** with policies: staff full;
  customer read on paths `bill/<bill_id>/...` for their own bills.
- `bill_rows.current_stage_id` is auto-set on insert to the first stage of the
  row's order type's workflow (Phase 1 trigger).
- Routes `/portal` and `/portal/bills/:id` exist as placeholders under
  `RoleRoute allow="customer"` + `PortalLayout` (Phase 1).
- `features/bills/` repository/hook/component pattern; `useBill(id)` query
  (`['bills', id]`), `BillDetailPage`, `BillStatusControl`; `formatCurrency`;
  neo `Card`/`Button`/`Modal`/`Field`/`StatusBadge`/`Toast`.
- `features/settings/` `useWorkflowTemplates()` (each `WorkflowTemplateVM` has
  `stages: WorkflowStageVM[]` with `id`/`name`/`sortOrder`/`color`/`isFinal`).

---

## 2. Scope

### In scope

1. **Order-stage tracking (staff)** — on `/bills/:id`, each row that has an
   order type shows a **stage stepper** (the workflow's stages in order, current
   one highlighted) with a control to move to any stage (forward or back), with
   an optional note. Below the rows, a **history timeline** for the whole bill
   (all `order_status_history` entries, newest first, with row name, from→to
   stage names, who, when, note).
2. **Customer portal**
   - `/portal` — the signed-in customer's bills: number, status pill, total,
     deadline, a coarse progress hint (e.g. "3 of 5 stages done" across tagged
     rows). Loading/error/empty.
   - `/portal/bills/:id` — read-only bill view: customer's own bill only
     (RLS + an explicit ownership check → "not found" otherwise). Shows the
     rows with each tagged row's stage stepper (read-only), the bill status,
     the history timeline, the comment thread (can post), and attachment
     **download** links.
3. **Comments** — `bill_comments` thread on both the staff `/bills/:id` and the
   portal bill view. Newest-last, author name + timestamp, a text box to post.
   Staff and the bill's customer can post; nobody edits/deletes in v4 (staff
   soft-delete exists in the RPC-less repo path but no UI).
4. **Attachments** — on staff `/bills/:id`: an upload control (choose file →
   upload to `attachments/bill/<bill_id>/<uuid>-<name>` → insert `attachments`
   row). On both sides: a list with size + a **download** action using a
   short-lived signed URL. Staff can remove an attachment (soft-delete row +
   delete object); customers cannot.
5. **Realtime** — a `useRealtimeBill(billId)` hook: subscribe to Supabase
   `postgres_changes` on `bills`, `bill_rows`, `order_status_history`,
   `bill_comments`, `attachments` filtered to that bill, and invalidate
   `['bills', billId]` + `['bill-history', billId]` + `['bill-comments', billId]`
   + `['bill-attachments', billId]` on any event. Used by both bill-detail pages.
   Enable Realtime on those tables in `supabase/config.toml` /
   the migration.
6. **RLS test coverage** — `supabase/tests/comments_attachments_rls.test.sql`:
   customer can insert a comment on their own bill but not on someone else's;
   customer can read attachments on their own bill only; the storage policy
   path check works.

### Out of scope (Phase 5)

- Editing/deleting comments from the UI; comment attachments; @mentions;
  notifications/email.
- Customer-editable anything (profile self-service, etc.).
- Bulk stage moves; automation ("advance all rows in stage X").
- Reports/dashboards; invoice PDF.
- Employee-specific permission differences (still `is_staff` everywhere).

---

## 3. Backend

One migration, `0007_realtime_and_history_view.sql`:

1. **Enable Realtime** on the five tables:
   ```sql
   alter publication supabase_realtime add table
     public.bills, public.bill_rows, public.order_status_history,
     public.bill_comments, public.attachments;
   ```
   (Realtime still honours RLS — customers only receive rows they can see.)
2. **`bill_history` view** for easy display — flattens `order_status_history`
   with stage names and actor name:
   ```sql
   create view public.bill_history as
   select
     h.id, r.bill_id, h.bill_row_id, r.detail as row_detail,
     fs.name as from_stage, ts.name as to_stage,
     h.note, h.created_at,
     p.full_name as changed_by_name
   from public.order_status_history h
   join public.bill_rows r on r.id = h.bill_row_id
   left join public.workflow_stages fs on fs.id = h.from_stage_id
   join public.workflow_stages ts on ts.id = h.to_stage_id
   left join public.profiles p on p.id = h.changed_by;
   ```
   The view runs with the querying user's rights against RLS-protected base
   tables (`security_invoker = true`), so staff see all and a customer sees only
   their own bills' history. Add `alter view public.bill_history set (security_invoker = true);`.
3. **`bill_stage_summary` view** (optional, for the portal progress hint):
   ```sql
   create view public.bill_stage_summary with (security_invoker = true) as
   select
     b.id as bill_id,
     count(r.id) filter (where r.order_type_id is not null) as tracked_rows,
     count(r.id) filter (where s.is_final) as completed_rows
   from public.bills b
   left join public.bill_rows r on r.bill_id = b.id and r.deleted_at is null
   left join public.workflow_stages s on s.id = r.current_stage_id
   group by b.id;
   ```

No new RPCs — `advance_bill_row_stage` already covers stage moves. Comment
inserts and attachment inserts go through plain `insert` (RLS allows them).
`database.types.ts` is regenerated after the migration.

---

## 4. Frontend architecture

```
src/features/
├── tracking/
│   ├── tracking.types.ts            StageVM, HistoryEntryVM
│   ├── data/tracking.repository.ts   advanceStage (rpc), listHistory(billId) (+ .test.ts)
│   ├── queries/useBillHistory.ts     ['bill-history', billId]
│   ├── mutations/useAdvanceStage.ts  invalidates ['bills',id] + ['bill-history',id]
│   └── components/
│       ├── StageStepper.tsx          stages in order; current highlighted; onPick(stageId) when interactive
│       └── HistoryTimeline.tsx       list of HistoryEntryVM
├── comments/
│   ├── comments.types.ts             CommentVM
│   ├── data/comment.repository.ts    list(billId) / add(billId, body) (+ .test.ts)
│   ├── queries/useComments.ts        ['bill-comments', billId]
│   ├── mutations/useAddComment.ts
│   └── components/CommentThread.tsx  list + composer
├── attachments/
│   ├── attachments.types.ts          AttachmentVM
│   ├── data/attachment.repository.ts list(billId) / upload(billId, File) / remove(id, path) / signedUrl(path) (+ .test.ts)
│   ├── queries/useAttachments.ts     ['bill-attachments', billId]
│   ├── mutations/useAttachmentMutations.ts
│   └── components/AttachmentList.tsx list + (staff) upload input + remove
├── realtime/
│   └── useRealtimeBill.ts            subscribes; invalidates the 4 keys
└── portal/
    ├── data/portalBill.repository.ts  get(id) with an explicit "is this my bill?" guard (reuse bill.repository.get + check customerId === auth uid)
    ├── queries/usePortalBills.ts      ['portal-bills'] — bills where customer_id = auth uid (RLS already filters; add a stage summary join)
    ├── PortalHomePage.tsx             (replace placeholder)
    └── PortalBillPage.tsx            (replace placeholder)
```

- Repositories own all Supabase calls (`from` / `rpc` / `storage` /
  `channel`). Components/hooks never call Supabase directly except
  `useRealtimeBill` (channel lifecycle) which lives in `features/realtime/`.
- `StageStepper` is shared: interactive on staff `/bills/:id`, `readOnly` on the
  portal.
- `HistoryTimeline`, `CommentThread`, `AttachmentList` are shared, gated by a
  `canWrite`/`canManage` prop derived from `useRole()` — staff pages pass
  `true` for stage/attachment management; the portal passes `false` for those
  and `true` only for posting comments.
- `useRealtimeBill(billId)` is mounted by both `BillDetailPage` and
  `PortalBillPage`.

### View-model types

```ts
// tracking.types.ts
export interface HistoryEntryVM {
  id: string
  rowDetail: string
  fromStage: string | null
  toStage: string
  note: string | null
  changedByName: string | null
  createdAt: string
}

// comments.types.ts
export interface CommentVM {
  id: string
  authorName: string
  authorIsStaff: boolean
  body: string
  createdAt: string
}

// attachments.types.ts
export interface AttachmentVM {
  id: string
  fileName: string
  sizeBytes: number | null
  storagePath: string
  uploadedByName: string | null
  createdAt: string
}
```

---

## 5. UX detail

### Staff `/bills/:id` (additions to the Phase 3 page)

- Each row in the rows table that has an order type gets, under it, a
  **`StageStepper`**: the workflow's stages left-to-right, coloured dot +
  name, the current stage filled, later stages muted. Clicking a stage opens a
  tiny inline confirm ("Move 'Banners' to 'Printing'? optional note") →
  `advanceStage`. Rows with no order type show "—".
- New **History** card below the rows: `HistoryTimeline` — reverse-chronological
  rows, each "*Banners* — Prep → Typing · Ava Admin · 2 Sep 14:03 · _note_".
- New **Comments** card: `CommentThread` (see below), `canPost = true`.
- New **Attachments** card: `AttachmentList` with `canManage = isStaff` — a
  file input + upload button, each file a row with name, size, Download, and
  (staff) a remove ✕.
- `useRealtimeBill(bill.id)` mounted — another staff member's stage move or a
  customer comment appears without refresh.

### Customer portal

- **`/portal` (`PortalHomePage`)** — heading "My Bills". `usePortalBills()`
  cards: `bill_number`, `StatusBadge`, `formatCurrency(total)`, deadline, and a
  slim progress bar "`completed_rows` / `tracked_rows` stages done" (hidden if
  `tracked_rows = 0`). Click → `/portal/bills/:id`. Empty: "No orders yet."
- **`/portal/bills/:id` (`PortalBillPage`)** — `portalBill.repository.get`
  returns null unless the bill's `customerId` is the signed-in user →
  "Bill not found." Otherwise:
  - Header: `bill_number`, `StatusBadge`, order date, deadline.
  - Rows table (read-only): detail, type, amount, and a **read-only
    `StageStepper`** per tagged row.
  - **Total / Paid / Balance** (same as staff, read-only).
  - **History** timeline (`HistoryTimeline`, no controls).
  - **Comments** (`CommentThread`, `canPost = true` — the customer can reply).
  - **Attachments** (`AttachmentList`, `canManage = false` — download only).
  - `useRealtimeBill(id)` mounted — staff stage moves / replies appear live.

### CommentThread

- Scrollable list, oldest→newest; each: author name (with a subtle "Staff" tag
  when `authorIsStaff`), relative time, body (preserve line breaks).
- Composer: a textarea + Send; disabled while empty or pending; clears on
  success. Errors → toast.

### AttachmentList

- Rows: file name, `formatBytes(sizeBytes)`, **Download** (fetches a signed URL
  then opens it), and, when `canManage`, a remove ✕ (confirm) that deletes the
  storage object and soft-deletes the row.
- When `canManage`: a `<input type="file">` + Upload button above the list.
  Client caps size at ~10 MB and shows a message otherwise. Path
  `bill/<billId>/<crypto.randomUUID()>-<sanitised name>`.

---

## 6. Testing

| Test | Kind |
|---|---|
| `tracking.repository` — `advanceStage` calls `advance_bill_row_stage` with `{p_row_id,p_to_stage_id,p_note}`; `listHistory` maps `bill_history` rows → `HistoryEntryVM` reverse-chron | unit (mocked `supabase`) |
| `comment.repository` — `list` maps rows (+ resolves `authorIsStaff` from the joined user type); `add` inserts `{bill_id, author_id, body}` | unit |
| `attachment.repository` — `upload` puts to the right path then inserts a row; `signedUrl` calls `createSignedUrl`; `remove` deletes object + soft-deletes row | unit |
| `StageStepper` — renders stages in `sortOrder`; highlights current; interactive mode calls `onPick(stageId)`, read-only mode renders no buttons | component |
| `HistoryTimeline` — renders entries; empty state | component |
| `CommentThread` — lists comments; composer posts and clears; Send disabled when empty | component |
| `AttachmentList` — `canManage=false` shows download only, no upload/remove; `canManage=true` shows upload + remove | component |
| `PortalBillPage` — renders a bill the customer owns; shows "not found" when `get` returns null; steppers are read-only; comment composer present | component (mocked hooks + `useAuth`) |
| `PortalHomePage` — lists the customer's bills with the progress hint; empty state | component |
| SQL `comments_attachments_rls.test.sql` — customer inserts a comment on own bill (ok) and on another's (rejected); customer reads attachments on own bill only; `bill_history` view respects RLS per role | SQL |

Manual (seeded users): as `admin@onevo.test` create a bill for
`customer@onevo.test` with a tagged row, advance it two stages with a note,
upload a file, post a comment. Sign in as `customer@onevo.test` → `/portal`
shows the bill with progress; open it → see the stepper, history, the file
(download works), reply to the comment; confirm the reply shows up on the staff
page **without refreshing** (realtime).

---

## 7. Definition of done

- [ ] `0007` applies from zero; Realtime enabled on the 5 tables; `bill_history`
      + `bill_stage_summary` views exist with `security_invoker`; types regenerated.
- [ ] SQL RLS test passes.
- [ ] `npm test` / `typecheck` / `lint` / `build` pass; count up from Phase 3's 58.
- [ ] Staff `/bills/:id`: per-row stepper moves stages (forward and back) with a
      note; history timeline updates; comments post; file upload + download +
      remove work.
- [ ] `/portal` (as `customer@onevo.test`): lists only that customer's bills
      with a correct progress hint; `/portal/bills/:id` is read-only, shows
      stepper + history + downloads, and the customer **can post a comment**;
      another customer's bill id → "not found".
- [ ] Realtime: a change on one open page appears on the other within a second
      or two, no manual refresh.
- [ ] `bill_comments` INSERT and `attachments`/storage RLS now have automated
      coverage.

---

## 8. Assumptions & open questions

**Assumptions**
- Stage moves are unrestricted (any stage → any stage) — matches the Phase 3
  "any bill-status transition" decision. The note is optional.
- Comments are plain text, no editing/deleting in the UI, visible to all staff
  and the one customer on the bill.
- Attachments: staff upload only; 10 MB soft cap enforced client-side; signed
  download URLs expire in ~60 s; path convention `bill/<billId>/...` (matches
  the Phase 1 storage policy — `bill_row`-scoped files are not used in v4).
- Realtime uses table-level `postgres_changes` filtered by `bill_id`; RLS still
  filters what each client receives. If a project has Realtime disabled at the
  platform level the pages still work (just no live updates).
- The portal shows history/strepper for *tagged* rows only; untyped rows just
  show detail + amount.

**Open questions (non-blocking)**
- Progress hint wording — "3 of 5 stages done" vs a bare bar. (Assumed: bar +
  small caption.)
- Should the customer see the internal `note` on history entries? (Assumed yes
  — keep it simple; staff can omit notes they don't want shared.)
- Do we want a "new activity" dot on `/portal` bills with unseen updates?
  (Deferred to Phase 5 / notifications.)
