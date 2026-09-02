# ONEVO — Phase 3 (Customers + Bills) Design Spec

**Document type:** Design specification
**Date:** 2026-09-01
**Phase:** 3 of 5 (Customers + Bills — staff-side CRUD)
**Status:** Draft — awaiting review
**Depends on:** Phase 1 (schema, RLS, auth, app shell, `admin-create-user` edge fn), Phase 2 (order types + workflows, repository/query-hook pattern) — both complete.

---

## 1. Context

Phases 1–2 built the database and the admin configuration screens. Phase 3 makes
the two core operational entities usable by staff: **customers** and **bills**
(a bill contains order rows). This is the data staff enter every day.

The customer portal, workflow-stage tracking, comments, and attachments are
Phase 4.

### What already exists

- Tables (Phase 1): `profiles`, `customers` (1:1 with a `customer`-type profile),
  `bills` (`bill_number` auto `INV-000001`, `bill_status_id` defaults to
  `pending`, `assert_customer_profile` trigger), `bill_rows` (`amount
  numeric(12,2)` may be negative, `current_stage_id` auto-set from the order
  type's first stage), `bill_statuses` (seeded 4), `paid_amount` column on
  `bills`, `bill_comments`, `attachments`, `audit_logs` (+ audit triggers on
  bills/bill_rows/customers).
- RLS: staff (`admin_member` + `employee`) read/write all customers, bills,
  bill_rows; customers see only their own.
- `admin-create-user` edge function — an admin creates an auth user with a temp
  password and `user_metadata.user_type`; the `handle_new_auth_user` trigger
  then makes the `profiles` + `customers` rows.
- Frontend: `features/settings/` established the repository → query-hook →
  mutation-hook → component pattern; `Card` / `Button` / `Modal` / `Field` /
  `StatusBadge` / `Toast`, `formatCurrency`, `useRole`, routing under the staff
  `AppLayout`.

---

## 2. Scope

### In scope

1. **Customers**
   - `/customers` list — search by name / company / email; loading / error /
     empty states.
   - **Add customer** — form (full name, email, phone, company, address line,
     city, notes, temp password). Calls `admin-create-user` with
     `user_type: 'customer'`, then updates the created `customers` row with the
     detail fields.
   - **Edit customer** — edits `customers` detail fields + `profiles.full_name`
     / `phone` (not email; email change is out of scope).
   - **Soft-delete customer** — blocked if the customer has any non-deleted
     bill; message names the count.
2. **Bills**
   - `/bills` list — search by bill number / customer name; each row shows
     number, customer, total, status pill, deadline; loading / error / empty.
   - **New bill** / **Edit bill** — pick customer (searchable), `order_date`
     (default today), `deadline` (optional), `notes`, and a repeatable **rows**
     editor: `detail`, optional **order type** (active types only; picking one
     pre-fills `amount` from `fixed_amount`, still editable), `amount` (+/−).
     Live **total** = sum of row amounts.
   - `/bills/:id` **detail** — customer + contact, dates, notes, rows table with
     per-row order-type tag and amount, **total / paid / balance**, a **status**
     control (Pending → Active → Completed → Paid, any transition allowed), a
     **record payment** control that sets `paid_amount`.
   - **Soft-delete bill** (with its rows).
3. Data layer: `features/customers/` and `features/bills/` modules following the
   Phase 2 pattern; one new migration for guard RPCs.
4. Tests per the Phase 2 style (repository mapping/mocked-client, form
   validation, list gating, SQL for the new RPCs).

### Out of scope (Phase 4+)

- Any customer-facing screen or the `/portal` routes.
- Workflow **stage** advancement / `order_status_history` / the
  `advance_bill_row_stage` RPC UI.
- `bill_comments` UI, `attachments` UI.
- No-login / walk-in customers (would need `customers.profile_id` nullable —
  future schema change, noted here only).
- Editing a customer's email; merging customers.
- Reports, exports, bulk actions, realtime.
- Invoice PDF / print / download.

---

## 3. Data model touchpoints

No schema column changes. One migration, `0006_customer_bill_rpcs.sql`, adds
`security definer` guard RPCs (staff-only; atomic multi-row writes):

| Function | Signature | Behaviour |
|---|---|---|
| `save_bill` | `(p_bill jsonb, p_rows jsonb) returns uuid` | Upserts a bill (`p_bill` = `{id?, customer_id, order_date, deadline, notes, paid_amount?}`) and replaces its rows from `p_rows` (ordered array of `{id?, detail, order_type_id, amount}`): upsert in array order with `sort_order = index`, soft-delete existing rows not present by id. Re-checks `is_staff()`. Returns the bill id. Lets the existing triggers fill `bill_number` / default status / `current_stage_id`. |
| `set_bill_status` | `(p_bill_id uuid, p_status_key text) returns void` | `is_staff()` only. Sets `bill_status_id` to the id of `bill_statuses.key = p_status_key`; raises if the key is unknown. |
| `soft_delete_bill` | `(p_bill_id uuid) returns void` | `is_staff()` only. Soft-deletes the bill and its `bill_rows`. |
| `soft_delete_customer` | `(p_profile_id uuid) returns void` | `is_staff()` only. Raises if the customer has any non-deleted `bills` (message gives the count). Soft-deletes the `customers` row and marks `profiles.status = 'disabled'` (keeps the auth user; no hard delete). |

`database.types.ts` is regenerated after this migration.

Why RPCs: `save_bill` makes "bill + N rows" one atomic write with server-set
`sort_order`, mirroring Phase 2's `replace_workflow_stages`. The delete guards
keep referential rules server-side rather than trusting the client.

---

## 4. Frontend architecture

```
src/features/
├── customers/
│   ├── customers.types.ts          CustomerVM
│   ├── data/customer.repository.ts  list / get / createWithLogin / updateDetail / softDelete
│   ├── queries/useCustomers.ts      list + single
│   ├── mutations/useCustomerMutations.ts
│   ├── components/
│   │   ├── CustomerList.tsx
│   │   └── CustomerFormModal.tsx    add (with temp password) | edit (no email/password)
│   └── CustomersPage.tsx            replaces the Phase 1 placeholder
└── bills/
    ├── bills.types.ts              BillListItemVM, BillDetailVM, BillRowVM, BillRowDraft
    ├── data/bill.repository.ts      list / get / save (RPC) / setStatus / recordPayment / softDelete
    ├── queries/useBills.ts          list + single (['bills'], ['bills', id])
    ├── mutations/useBillMutations.ts
    ├── components/
    │   ├── BillList.tsx
    │   ├── BillRowsEditor.tsx        repeatable row editor with live total
    │   ├── BillFormModal.tsx         customer picker + fields + <BillRowsEditor>
    │   ├── BillStatusControl.tsx     4-state segmented control
    │   └── RecordPaymentModal.tsx
    ├── BillsPage.tsx                 list + New/Edit modal; replaces placeholder
    └── BillDetailPage.tsx           /bills/:id
```

- Repositories own every `supabase.from` / `.rpc`; components/hooks never call
  Supabase directly. Rows → camelCase VMs.
- `customer.repository.createWithLogin` calls
  `supabase.functions.invoke('admin-create-user', { body: {...} })`, then on
  success calls `updateDetail` for the company/address/notes fields.
- New route: `/bills/:id` added to `AppRouter` under the staff `AppLayout`
  (the existing `/bills` stays the list).
- Customer picker in `BillFormModal`: a lightweight searchable `<select>` /
  combobox over `useCustomers()` data (client-side filter is fine at this
  scale; server-side search is a later optimisation).

### View-model types

```ts
// customers.types.ts
export interface CustomerVM {
  profileId: string
  fullName: string
  email: string
  phone: string | null
  companyName: string | null
  addressLine: string | null
  city: string | null
  notes: string | null
  billCount: number        // non-deleted bills, for the delete guard hint
}

// bills.types.ts
export interface BillRowVM {
  id: string
  detail: string
  orderTypeId: string | null
  orderTypeName: string | null
  amount: number
}
export interface BillListItemVM {
  id: string
  billNumber: string
  customerId: string
  customerName: string
  statusKey: string
  statusLabel: string
  total: number
  paidAmount: number
  orderDate: string
  deadline: string | null
}
export interface BillDetailVM extends BillListItemVM {
  customerEmail: string
  customerPhone: string | null
  notes: string | null
  rows: BillRowVM[]
}
export interface BillRowDraft {
  id?: string
  detail: string
  orderTypeId: string | null
  amount: number
}
```

---

## 5. UX detail

- **Customers list:** neo `Card` rows — name, company (muted), email/phone;
  Edit + Delete. Search input (`Field`, debounced client filter). Empty:
  "No customers yet — add your first."
- **Customer form (`Modal`):**
  - Add mode: full name, email, phone, company, address line, city, notes,
    **temp password** (min 8; helper text "The customer can change this after
    their first sign-in"). Save disabled until name + valid email + password.
  - Edit mode: same fields except email (shown read-only) and no password.
  - Errors from the edge function (e.g. duplicate email) surface as a toast.
- **Bills list:** `Card` rows — `bill_number` (bold), customer, `formatCurrency(total)`,
  `StatusBadge` (colour per status: pending=secondary, active=primary,
  completed=success, paid=success), deadline (or "—"). Search over number +
  customer name. Empty: "No bills yet."
- **Bill form (`Modal`, wide):**
  - Customer combobox (required); if no customers exist, a hint linking to
    `/customers`.
  - `order_date` (date, default today), `deadline` (date, optional), `notes`
    (textarea).
  - `BillRowsEditor`: each row = `detail` `Field`, order-type `<select>`
    (blank = "no type"; options are active order types with their names),
    `amount` number `Field` (accepts negative). "+ Add row". Row delete icon.
    Selecting an order type sets `amount` to that type's `fixedAmount` when the
    amount is currently 0/empty (does not clobber a typed value).
  - Live **Total: `formatCurrency(sum)`** below the rows.
  - Save disabled until a customer is picked and there is ≥1 row with a
    non-empty `detail`. Calls `save_bill`; on success close + toast + invalidate
    `['bills']` (and `['bills', id]` on edit).
- **Bill detail (`/bills/:id`):**
  - Header: `bill_number`, `StatusBadge`, customer name → (mailto/tel shown as
    text), Edit + Delete buttons.
  - Meta card: order date, deadline, notes.
  - Rows table: detail, order-type tag, amount (right-aligned); footer rows:
    **Total**, **Paid**, **Balance** (`total - paid`, red if > 0).
  - `BillStatusControl`: four buttons/segments; clicking one calls
    `set_bill_status` and invalidates. Current status highlighted.
  - **Record payment** button → `RecordPaymentModal` (amount number, defaults
    to current balance) → `recordPayment` sets `paid_amount`.
  - Loading skeleton; "Bill not found" if the id doesn't resolve.
- **Deletes** confirm via `Modal`. Customer delete blocked when `billCount > 0`
  (message names the count; no confirm button in that case — client already has
  the count, so this one *can* pre-disable, unlike Phase 2's workflow case).
- Mobile: cards stack; the bill form modal is full-width scroll; rows editor
  fields wrap; the rows table on detail scrolls horizontally inside its own
  container.

---

## 6. Testing

| Test | Kind |
|---|---|
| `customer.repository` — `list` maps rows + counts bills; `createWithLogin` invokes the function then `updateDetail` | unit (mocked `supabase`) |
| `bill.repository` — `list`/`get` mapping incl. total = sum(rows), status join, order-type name join; `save` builds the `save_bill` payload; `setStatus`/`recordPayment` call shape | unit (mocked `supabase`) |
| `BillRowsEditor` — add/delete row; live total; picking an order type fills a zero amount but not a typed one | component |
| `BillFormModal` — Save gated on customer + ≥1 detailed row; submit payload shape | component |
| `CustomerFormModal` — add-mode gating (name + email + password); edit-mode hides password, email read-only | component |
| `BillStatusControl` — clicking a status calls `setStatus` with the right key | component |
| `CustomersPage` / `BillsPage` — render list, search filters, empty state | component |
| SQL `supabase/tests/customer_bill_rpcs.test.sql` — `save_bill` inserts bill + rows with contiguous sort_order and lets triggers fill number/status/stage; re-save soft-deletes dropped rows; `set_bill_status` rejects a bad key; `soft_delete_customer` blocks when bills exist; all four reject a non-staff caller |

Manual check (seeded `admin@onevo.test` / `staff@onevo.test`): add a customer,
create a bill with two rows (one tagged with the Phase 2 order type, amount
pre-filled), see the total, change status, record a partial payment, see the
balance, delete the bill, then delete the customer.

---

## 7. Definition of done

- [ ] `0006_customer_bill_rpcs.sql` applies from zero; `database.types.ts` regenerated.
- [ ] SQL test for the new RPCs passes.
- [ ] `npm test`, `typecheck`, `lint`, `build` all pass; test count up from Phase 2's 43.
- [ ] `/customers`: add (creates a working login — verify the new user can sign
      in), edit, search, delete (blocked while a bill exists).
- [ ] `/bills`: create with multiple rows incl. an order-type-tagged row whose
      amount pre-fills; live total correct; list shows total + status; edit
      re-saves; soft-delete removes it from the list.
- [ ] `/bills/:id`: total / paid / balance correct; status control changes the
      status and persists; record payment updates the balance.
- [ ] As `staff@onevo.test` (employee): full CRUD works (bills/customers are not
      admin-gated in this phase).
- [ ] A customer signing in still lands on `/portal` and cannot reach `/bills`
      or `/customers` (Phase 1 guards unchanged).

---

## 8. Assumptions & open questions

**Assumptions**
- Every customer has an auth account (created via the edge fn). Walk-in
  customers without a login are a future schema change.
- Any bill-status transition is allowed (no enforced order); the 4 keys are
  fixed from Phase 1 seed.
- `paid_amount` is a single running number set via "record payment" (it
  overwrites, it is not an append-only ledger of payments — a payments table is
  a possible future refinement).
- Client-side search/filter for customers and bills is acceptable at expected
  volume; server-side pagination/search is deferred.
- Employees have the same bill/customer permissions as admins in this phase.

**Open questions (non-blocking)**
- Should the bill form let you set an initial status other than Pending?
  (Assumed no — always starts Pending, change it from the detail page.)
- Should deleting a bill be allowed once it is `paid`? (Assumed yes — soft
  delete only, recoverable in the DB.)
- Record-payment: allow overpayment (`paid > total`)? (Assumed yes — no
  validation cap; balance just goes negative and shows as a credit.)
