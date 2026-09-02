# ONEVO — Phase 2 (Admin Config) Design Spec

**Document type:** Design specification
**Date:** 2026-09-01
**Phase:** 2 of 5 (Admin config — order types, workflows, stages)
**Status:** Draft — awaiting review
**Depends on:** Phase 1 (schema, RLS, auth, app shell) — complete.

---

## 1. Context

Phase 1 built the database (including `workflow_templates`, `workflow_stages`,
`order_types`) and the app shell with a placeholder `/settings` page. Phase 2
makes `/settings` real: the screens where an **admin** defines the order types
their business handles and the workflow each one runs through.

This phase also establishes the **data-access + query-hook pattern** that
Phases 3 and 4 copy for customers, bills, and tracking.

### What already exists (Phase 1)

- Tables `workflow_templates`, `workflow_stages`, `order_types` with `deleted_at`
  soft delete, `updated_at` triggers, audit triggers, and RLS: **staff read,
  admin write**; customers have no access.
- `workflow_stages` has `constraint workflow_stages_order_uniq unique
  (template_id, sort_order) deferrable initially deferred` — reordering must
  happen in one transaction.
- `order_types.workflow_template_id` is `not null references
  workflow_templates(id)` (no cascade) — a template referenced by an order type
  cannot be hard-deleted; soft delete must be blocked in the UI/service.
- App shell: React Router, `AppLayout` (staff), `useAuth` / `useRole`,
  `isAdmin` / `isStaff`, TanStack Query provider, `Card` / `Button` / `Modal` /
  `Toast` / `Field`, `supabase` typed client.

---

## 2. Scope

### In scope

1. `/settings` as a tabbed page: **Workflows** and **Order Types**.
2. **Workflows tab:** list templates (name, stage count, active); create / edit /
   soft-delete a template; within the editor, manage its stages — add, rename,
   reorder (up/down), delete, set colour, mark exactly one as the final stage.
3. **Order Types tab:** list order types (name, linked workflow, fixed amount,
   active); create / edit / soft-delete; pick a workflow template; optional
   `fixed_amount`; `is_active` toggle.
4. Data-access layer: `features/settings/data/*.repository.ts` + TanStack Query
   query/mutation hooks with cache invalidation and optimistic-free (simple)
   updates.
5. Permission gating: writes visible only to `isAdmin`; employees see the lists
   read-only. RLS is the real boundary.
6. Loading / error / empty states on every list.
7. Tests: repository query shape (mocked client), reorder logic, form
   validation, a component test per tab for the admin-vs-employee gate.

### Out of scope

- Customers, bills, bill rows (Phase 3).
- Applying a workflow to a real order / advancing stages (Phase 4).
- Drag-and-drop reordering (arrows only in v2).
- Bulk import/export, workflow duplication, per-stage SLA/automation.
- An "archived items" view — soft-deleted rows simply disappear from lists.
- Realtime subscriptions.

---

## 3. Data model touchpoints

No schema changes. Phase 2 reads/writes these existing tables:

| Table | Columns used |
|---|---|
| `workflow_templates` | id, name, description, is_active, created_by, deleted_at, updated_at |
| `workflow_stages` | id, template_id, name, sort_order, color, is_final, deleted_at |
| `order_types` | id, name, workflow_template_id, fixed_amount, is_active, created_by, deleted_at |

### Rules enforced in the service layer (not DB constraints)

- **Exactly one final stage** per template with ≥1 stage. Setting `is_final` on a
  stage clears it on the others (single UPDATE per stage in one transaction).
- **Stage `sort_order`** is always the contiguous sequence `1..n` after any add /
  delete / reorder. Writes go through a single RPC (see §4) so the deferrable
  unique constraint is satisfied at commit.
- **Block soft-deleting a workflow template** that is referenced by any
  non-deleted `order_types` row — the UI shows which order types block it.
- A template needs **at least one stage** before it can be marked `is_active`.
- Deleting a stage is a soft delete; remaining stages are renumbered.

---

## 4. Backend additions

One migration, `0005_workflow_stage_rpcs.sql`, adding `security definer`
functions callable by admins (they re-check `is_admin()` and run their writes in
a single transaction so the deferrable `sort_order` unique constraint holds):

| Function | Signature | Behaviour |
|---|---|---|
| `replace_workflow_stages` | `(p_template_id uuid, p_stages jsonb) returns void` | `p_stages` is an ordered JSON array of `{id?, name, color, is_final}`. Upserts stages in array order with `sort_order = index+1`; soft-deletes any existing stage not present by id; raises if not exactly one `is_final`; raises unless `is_admin()`. |
| `soft_delete_workflow_template` | `(p_template_id uuid) returns void` | Raises unless `is_admin()`. Raises if any non-deleted `order_types` references it (message lists their names). Sets `deleted_at = now()` on the template and its stages. |
| `soft_delete_order_type` | `(p_order_type_id uuid) returns void` | Raises unless `is_admin()`. Sets `deleted_at = now()`. |

Rationale: doing the stage set as one server-side call keeps the client simple,
makes the "one final stage" and "contiguous sort_order" invariants atomic, and
avoids multiple round-trips fighting the deferrable unique constraint.

`database.types.ts` is regenerated after this migration.

---

## 5. Frontend architecture

```
src/features/settings/
├── SettingsPage.tsx            tab shell (Workflows | Order Types); replaces the placeholder
├── data/
│   ├── workflow.repository.ts   list/get/create/update templates; replace_workflow_stages; soft delete
│   └── orderType.repository.ts  list/get/create/update/soft delete order types
├── queries/
│   ├── useWorkflowTemplates.ts  list + single
│   └── useOrderTypes.ts         list + single
├── mutations/
│   ├── useWorkflowMutations.ts  create/update/delete template, saveStages
│   └── useOrderTypeMutations.ts create/update/delete order type
├── components/
│   ├── WorkflowList.tsx
│   ├── WorkflowFormModal.tsx    name/description/active + <StageEditor>
│   ├── StageEditor.tsx          add / rename / up-down / delete / colour / final radio
│   ├── OrderTypeList.tsx
│   └── OrderTypeFormModal.tsx   name / workflow select / fixed amount / active
└── settings.types.ts           view-model types (camelCase) mapped from DB rows
```

- **Repositories** own all `supabase.from(...)` / `supabase.rpc(...)` calls and
  map snake_case rows to camelCase view-model types. No Supabase calls in
  components or hooks beyond the repo.
- **Query hooks** wrap TanStack Query with stable query keys
  (`['workflow_templates']`, `['workflow_templates', id]`, `['order_types']`).
- **Mutation hooks** call the repo then `queryClient.invalidateQueries` for the
  affected keys; surface errors via `useToast`.
- **Forms:** React Hook Form + Zod, same pattern as the Phase 1 auth screens,
  reusing `Field`, `Button`, `Modal`, `Card`.
- **Gating:** `SettingsPage` reads `useRole()`. Non-admin staff see the lists and
  the tab shell but no "New" / "Edit" / "Delete" controls and get read-only form
  modals disabled; RLS blocks writes regardless.

### View-model types (`settings.types.ts`)

```ts
export interface WorkflowStageVM {
  id: string
  name: string
  sortOrder: number
  color: string
  isFinal: boolean
}
export interface WorkflowTemplateVM {
  id: string
  name: string
  description: string | null
  isActive: boolean
  stages: WorkflowStageVM[]
}
export interface OrderTypeVM {
  id: string
  name: string
  workflowTemplateId: string
  workflowName: string        // joined for display
  fixedAmount: number | null
  isActive: boolean
}
```

---

## 6. UX detail

- **Settings shell:** neo `Card` container, a simple two-item tab strip
  (`Workflows` | `Order Types`) using `--color-neo-primary` for the active tab,
  content below. Tab state in the URL as `?tab=workflows|order-types` so it
  survives refresh; default `workflows`.
- **Workflow list:** one `Card` per template — name, `is_active` pill, stage
  chips in order (colour dot + name, "✓ final" on the final one), Edit + Delete
  (admin only). Empty state: "No workflows yet — create one to define how an
  order type progresses."
- **Workflow editor (`Modal`):** name, description, active checkbox, then
  `StageEditor`:
  - each stage row: colour swatch (opens a small preset palette of the neo
    tokens + a few extras), name `Field`, "final" radio (exactly one), up /
    down icon buttons (disabled at ends), delete icon.
  - "+ Add stage" appends a row.
  - Save is disabled until: name non-empty, ≥1 stage, every stage named, exactly
    one final. Save calls `replace_workflow_stages` then the template update in
    one mutation; on success close + toast + invalidate.
- **Order Type list:** one `Card` per type — name, linked workflow name, fixed
  amount (`LKR` formatted or "—"), `is_active` pill, Edit + Delete (admin only).
  Empty state: "No order types yet."
- **Order Type editor (`Modal`):** name `Field`; workflow `<select>` of active
  templates (shows a hint if none exist yet, links to the Workflows tab); fixed
  amount number `Field` (optional, ≥ 0); active checkbox.
- **Delete confirms** via `Modal`. Template delete that is blocked shows the
  referencing order-type names and no confirm button.
- All lists: skeleton while loading, error card with retry, empty state as above.
- Mobile: cards stack; editor `Modal` is full-width with scroll; stage rows wrap.

---

## 7. Currency formatting

Add `src/shared/utils/formatCurrency.ts` — `formatCurrency(amount: number |
null, opts?: { code?: string; locale?: string })` using `Intl.NumberFormat`,
defaulting to `LKR` / `en-LK` (matches `organization_settings`). A follow-up
phase can wire it to live settings; Phase 2 uses the constant default. Returns
`'—'` for `null`.

---

## 8. Testing

| Test | Kind |
|---|---|
| `workflow.repository` maps rows to VM, builds correct `rpc` payload for `replace_workflow_stages` | unit (mocked `supabase`) |
| `orderType.repository` list join + soft delete call | unit (mocked `supabase`) |
| `StageEditor` — add / reorder up-down / delete renumbers; "final" radio is exclusive; Save disabled until valid | component |
| `WorkflowFormModal` — Zod validation messages; submit calls the mutation with expected args | component |
| `OrderTypeFormModal` — workflow select required, fixed amount ≥ 0 | component |
| `SettingsPage` — employee sees lists but no New/Edit/Delete; admin sees them | component |
| `formatCurrency` — LKR formatting, null → '—' | unit |
| SQL: `replace_workflow_stages` renumbers + enforces one final + admin-only; `soft_delete_workflow_template` blocks when referenced | `supabase/tests/workflow_rpcs.test.sql` |

No E2E in Phase 2 (manual check with the seeded `admin@onevo.test`).

---

## 9. Definition of done

- [ ] `0005_workflow_stage_rpcs.sql` applies from zero; `database.types.ts` regenerated.
- [ ] SQL test for the new RPCs passes (renumber, one-final, admin-only, delete-block).
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- [ ] Signed in as `admin@onevo.test`: can create a workflow with stages, reorder
      them, set colours, mark a final stage, save; edit and re-save; create an
      order type linked to it; soft-delete both (template delete blocked while
      the order type references it).
- [ ] Signed in as `staff@onevo.test` (employee): sees both lists read-only, no
      write controls, and a direct write attempt is rejected by RLS.
- [ ] Lists show loading, error, and empty states.
- [ ] Tab selection persists across refresh via the URL query param.

---

## 10. Assumptions & open questions

**Assumptions**
- Stage colour is a free hex string in the DB; the UI offers a small preset
  palette but stores whatever hex is chosen.
- Save is blocked until a template has ≥1 stage and exactly one final stage
  (§6), so every persisted template is always coherent. `is_active` is a
  separate flag on top of that — a coherent template can still be saved
  inactive (e.g. still being drafted for later use).
- Employees (when they exist) never write here; no employee-specific read
  differences.
- `fixed_amount` is a plain default number shown to staff later when adding a
  bill row of that type — Phase 2 only stores it.

**Open questions (not blocking)**
- Should reordering also be possible from the workflow list without opening the
  editor? (Assumed no — editor only.)
- Do we need a "duplicate workflow" action? (Deferred.)
- Colour palette contents — using the neo tokens + ~4 extra hues unless you want
  a specific set.
