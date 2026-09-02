# ONEVO Phase 2 (Admin Config) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin `/settings` screens — Workflows (templates + stages) and Order Types — on top of the Phase 1 schema, establishing the repository → query-hook → component pattern later phases reuse.

**Architecture:** One new migration adds three admin-only `security definer` RPCs that make stage reordering and safe deletes atomic. The frontend adds a `features/settings/` module: repositories own all Supabase calls and map rows to camelCase view models, TanStack Query hooks wrap them with stable keys and invalidation, and React Hook Form + Zod components (matching the Phase 1 auth screens) drive the UI. `SettingsPage` replaces the Phase 1 placeholder with a two-tab shell.

**Tech Stack:** Same as Phase 1 — React 19, TypeScript, TanStack Query, React Hook Form + Zod, Tailwind v4 neo tokens, Supabase (Postgres RPC + RLS).

**Spec:** `docs/superpowers/specs/2026-09-01-onevo-phase-2-admin-config-design.md`

## Global Constraints

- Extends Phase 1 — do not modify `0001`–`0004` migrations; add `0005_workflow_stage_rpcs.sql`.
- All Supabase calls live in `features/settings/data/*.repository.ts` — no `supabase.from`/`supabase.rpc` in components or hooks.
- View models are camelCase (`settings.types.ts`); DB rows stay snake_case until mapped.
- Admin-only writes: UI hides write controls for non-admin staff (`useRole().isAdmin`); RLS + the RPCs' own `is_admin()` check are the real boundary — do not rely on the UI gate alone.
- Currency: `formatCurrency` defaults to `LKR` / `en-LK`.
- Soft delete everywhere already in the schema; no hard deletes.
- **Do NOT run git.** Report "ready to commit: `<msg>`" at the end of each task; the user commits.
- Local dev DB: `docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < file.sql` for SQL tests (no `supabase db execute` in this CLI). Test accounts from `supabase/seed.sql`: `admin@onevo.test` / `staff@onevo.test` / `customer@onevo.test`, password `password123`.

---

## File Structure

```
supabase/
├── migrations/0005_workflow_stage_rpcs.sql
└── tests/workflow_rpcs.test.sql

src/
├── shared/utils/formatCurrency.ts (+ .test.ts)
└── features/settings/
    ├── settings.types.ts
    ├── data/
    │   ├── workflow.repository.ts (+ .test.ts)
    │   └── orderType.repository.ts (+ .test.ts)
    ├── queries/
    │   ├── useWorkflowTemplates.ts
    │   └── useOrderTypes.ts
    ├── mutations/
    │   ├── useWorkflowMutations.ts
    │   └── useOrderTypeMutations.ts
    ├── components/
    │   ├── StageEditor.tsx (+ .test.tsx)
    │   ├── WorkflowFormModal.tsx (+ .test.tsx)
    │   ├── WorkflowList.tsx
    │   ├── OrderTypeFormModal.tsx (+ .test.tsx)
    │   └── OrderTypeList.tsx
    └── SettingsPage.tsx (+ .test.tsx, replaces the Phase 1 placeholder)
```

---

## Task 1: Migration 0005 — workflow stage RPCs

**Files:**
- Create: `supabase/migrations/0005_workflow_stage_rpcs.sql`
- Test: `supabase/tests/workflow_rpcs.test.sql`

**Interfaces:**
- Produces: `public.replace_workflow_stages(p_template_id uuid, p_stages jsonb) returns void`, `public.soft_delete_workflow_template(p_template_id uuid) returns void`, `public.soft_delete_order_type(p_order_type_id uuid) returns void`.

- [ ] **Step 1: Write the migration**

```sql
-- 0005_workflow_stage_rpcs.sql

create or replace function public.replace_workflow_stages(p_template_id uuid, p_stages jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_final_count int;
  v_len int;
  v_item jsonb;
  v_idx int := 0;
  v_id uuid;
  v_keep_ids uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'only admins can edit workflow stages';
  end if;

  select jsonb_array_length(p_stages) into v_len;
  if v_len is null or v_len < 1 then
    raise exception 'a workflow needs at least one stage';
  end if;

  select count(*) into v_final_count
  from jsonb_array_elements(p_stages) e
  where (e->>'is_final')::boolean is true;
  if v_final_count <> 1 then
    raise exception 'exactly one stage must be marked final (got %)', v_final_count;
  end if;

  -- Defer the (template_id, sort_order) unique check to commit so the
  -- renumber below can pass through intermediate collisions.
  set constraints public.workflow_stages_order_uniq deferred;

  for v_item in select * from jsonb_array_elements(p_stages)
  loop
    v_idx := v_idx + 1;
    v_id := nullif(v_item->>'id', '')::uuid;

    if v_id is not null and exists (
      select 1 from public.workflow_stages where id = v_id and template_id = p_template_id
    ) then
      update public.workflow_stages
      set name = v_item->>'name',
          color = coalesce(v_item->>'color', '#5A7BFF'),
          is_final = (v_item->>'is_final')::boolean,
          sort_order = v_idx,
          deleted_at = null
      where id = v_id;
    else
      insert into public.workflow_stages (template_id, name, color, is_final, sort_order)
      values (p_template_id, v_item->>'name', coalesce(v_item->>'color', '#5A7BFF'),
              (v_item->>'is_final')::boolean, v_idx)
      returning id into v_id;
    end if;

    v_keep_ids := v_keep_ids || v_id;
  end loop;

  update public.workflow_stages
  set deleted_at = now()
  where template_id = p_template_id
    and deleted_at is null
    and not (id = any(v_keep_ids));
end $$;

create or replace function public.soft_delete_workflow_template(p_template_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_blockers text;
begin
  if not public.is_admin() then
    raise exception 'only admins can delete workflows';
  end if;

  select string_agg(name, ', ') into v_blockers
  from public.order_types
  where workflow_template_id = p_template_id and deleted_at is null;

  if v_blockers is not null then
    raise exception 'cannot delete: still used by order type(s): %', v_blockers;
  end if;

  update public.workflow_templates set deleted_at = now() where id = p_template_id;
  update public.workflow_stages set deleted_at = now()
  where template_id = p_template_id and deleted_at is null;
end $$;

create or replace function public.soft_delete_order_type(p_order_type_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can delete order types';
  end if;
  update public.order_types set deleted_at = now() where id = p_order_type_id;
end $$;
```

- [ ] **Step 2: Apply**

Run: `supabase db reset`
Expected: `0001`–`0005` apply cleanly, then `supabase/seed.sql` re-seeds the 3 test users.

- [ ] **Step 3: Write `supabase/tests/workflow_rpcs.test.sql`**

```sql
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'admin2@t.co', '{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'cust2@t.co',  '{"user_type":"customer"}');

insert into public.workflow_templates (id, name)
values ('00000000-0000-0000-0000-000000090001', 'T1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

-- reject: no final stage
do $$
begin
  begin
    perform public.replace_workflow_stages('00000000-0000-0000-0000-000000090001',
      '[{"name":"A","is_final":false},{"name":"B","is_final":false}]'::jsonb);
    raise exception 'FAIL: accepted stages with zero final';
  exception when others then
    if sqlerrm like '%exactly one stage must be marked final%' then raise notice 'OK: zero-final rejected';
    else raise; end if;
  end;
end $$;

-- accept: one final, creates 3 stages in order
select public.replace_workflow_stages('00000000-0000-0000-0000-000000090001',
  '[{"name":"Prep","is_final":false,"color":"#111111"},
    {"name":"Work","is_final":false},
    {"name":"Done","is_final":true}]'::jsonb);

select array_agg(name order by sort_order) = array['Prep','Work','Done'] as order_ok
from public.workflow_stages where template_id = '00000000-0000-0000-0000-000000090001' and deleted_at is null;

-- re-save with one stage removed, one renamed, order changed -> old row soft-deleted, new sort_order contiguous
select public.replace_workflow_stages('00000000-0000-0000-0000-000000090001',
  jsonb_build_array(
    jsonb_build_object('id', (select id from public.workflow_stages where template_id='00000000-0000-0000-0000-000000090001' and name='Done'), 'name', 'Finished', 'is_final', true),
    jsonb_build_object('name', 'New Step', 'is_final', false)
  ));

select count(*) = 2 as live_stage_count
from public.workflow_stages where template_id = '00000000-0000-0000-0000-000000090001' and deleted_at is null;

select array_agg(name order by sort_order) = array['Finished','New Step'] as renumbered_ok
from public.workflow_stages where template_id = '00000000-0000-0000-0000-000000090001' and deleted_at is null;

-- order type referencing the template blocks delete
insert into public.order_types (id, name, workflow_template_id)
values ('00000000-0000-0000-0000-0000000a0001', 'OT1', '00000000-0000-0000-0000-000000090001');

do $$
begin
  begin
    perform public.soft_delete_workflow_template('00000000-0000-0000-0000-000000090001');
    raise exception 'FAIL: deleted a template still referenced by an order type';
  exception when others then
    if sqlerrm like '%still used by order type%' then raise notice 'OK: delete blocked';
    else raise; end if;
  end;
end $$;

-- delete the order type, then the template delete succeeds
select public.soft_delete_order_type('00000000-0000-0000-0000-0000000a0001');
select public.soft_delete_workflow_template('00000000-0000-0000-0000-000000090001');

select (deleted_at is not null) as template_deleted
from public.workflow_templates where id = '00000000-0000-0000-0000-000000090001';

-- non-admin is rejected
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
do $$
begin
  begin
    perform public.replace_workflow_stages('00000000-0000-0000-0000-000000090001', '[{"name":"X","is_final":true}]'::jsonb);
    raise exception 'FAIL: customer edited workflow stages';
  exception when others then
    if sqlerrm like '%only admins%' then raise notice 'OK: customer blocked';
    else raise; end if;
  end;
end $$;

reset role;
rollback;
```

- [ ] **Step 4: Run**

Run: `docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/workflow_rpcs.test.sql`
Expected: all `notice`/boolean checks read `OK`/`t`, no unexpected errors.

- [ ] **Step 5: Commit**

Report ready to commit: `feat(db): add workflow stage RPCs (replace_workflow_stages, soft-delete guards)`

---

## Task 2: Regenerate DB types + currency formatter

**Files:**
- Modify: `src/core/supabase/database.types.ts`
- Create: `src/shared/utils/formatCurrency.ts`, `src/shared/utils/formatCurrency.test.ts`

**Interfaces:**
- Produces: `formatCurrency(amount: number | null, opts?: { code?: string; locale?: string }) => string`

- [ ] **Step 1: Regenerate types**

Run: `supabase gen types typescript --local > src/core/supabase/database.types.ts`

- [ ] **Step 2: Write the failing test**

```ts
// src/shared/utils/formatCurrency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/shared/utils/formatCurrency'

describe('formatCurrency', () => {
  it('formats a number as LKR by default', () => {
    expect(formatCurrency(1500)).toMatch(/1,500/)
  })
  it('returns an em dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
  it('accepts a currency override', () => {
    expect(formatCurrency(10, { code: 'USD', locale: 'en-US' })).toContain('10')
  })
})
```

- [ ] **Step 3: Run, expect failure**

Run: `npm test -- formatCurrency`

- [ ] **Step 4: Implement**

```ts
// src/shared/utils/formatCurrency.ts
export function formatCurrency(
  amount: number | null,
  opts: { code?: string; locale?: string } = {},
): string {
  if (amount === null) return '—'
  const { code = 'LKR', locale = 'en-LK' } = opts
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount)
}
```

- [ ] **Step 5: Run, typecheck, commit**

Run: `npm test -- formatCurrency`, `npm run typecheck`
Report ready to commit: `chore(db): regenerate types; add formatCurrency util`

---

## Task 3: Settings view-model types + repositories

**Files:**
- Create: `src/features/settings/settings.types.ts`
- Create: `src/features/settings/data/workflow.repository.ts` (+ `.test.ts`)
- Create: `src/features/settings/data/orderType.repository.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `supabase` client, `Database` types.
- Produces:
  - `WorkflowStageVM`, `WorkflowTemplateVM`, `OrderTypeVM` (per spec §5).
  - `workflowRepository.list(): Promise<WorkflowTemplateVM[]>`
  - `workflowRepository.get(id: string): Promise<WorkflowTemplateVM | null>`
  - `workflowRepository.upsertTemplate(input: { id?: string; name: string; description: string | null; isActive: boolean }): Promise<string>` (returns template id)
  - `workflowRepository.saveStages(templateId: string, stages: { id?: string; name: string; color: string; isFinal: boolean }[]): Promise<void>`
  - `workflowRepository.softDeleteTemplate(id: string): Promise<void>`
  - `orderTypeRepository.list(): Promise<OrderTypeVM[]>`
  - `orderTypeRepository.upsert(input: { id?: string; name: string; workflowTemplateId: string; fixedAmount: number | null; isActive: boolean }): Promise<void>`
  - `orderTypeRepository.softDelete(id: string): Promise<void>`

- [ ] **Step 1: Write `settings.types.ts`**

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
  workflowName: string
  fixedAmount: number | null
  isActive: boolean
}
```

- [ ] **Step 2: Write failing repository tests**

```ts
// src/features/settings/data/workflow.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  order: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: state.order.mockResolvedValue({
        data: [
          {
            id: 't1',
            name: 'Printing',
            description: null,
            is_active: true,
            workflow_stages: [
              { id: 's2', name: 'Done', sort_order: 2, color: '#000', is_final: true, deleted_at: null },
              { id: 's1', name: 'Prep', sort_order: 1, color: '#fff', is_final: false, deleted_at: null },
            ],
          },
        ],
        error: null,
      }),
    })),
    rpc: state.rpc,
  },
}))

import { workflowRepository } from '@/features/settings/data/workflow.repository'

describe('workflowRepository.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps rows to camelCase VMs with stages sorted by sortOrder', async () => {
    const result = await workflowRepository.list()
    expect(result).toEqual([
      {
        id: 't1',
        name: 'Printing',
        description: null,
        isActive: true,
        stages: [
          { id: 's1', name: 'Prep', sortOrder: 1, color: '#fff', isFinal: false },
          { id: 's2', name: 'Done', sortOrder: 2, color: '#000', isFinal: true },
        ],
      },
    ])
  })
})

describe('workflowRepository.saveStages', () => {
  it('calls the replace_workflow_stages RPC with an ordered payload', async () => {
    await workflowRepository.saveStages('t1', [
      { name: 'Prep', color: '#fff', isFinal: false },
      { id: 's2', name: 'Done', color: '#000', isFinal: true },
    ])
    const state2 = (await import('@/core/supabase/client')).supabase
    expect(state2.rpc).toHaveBeenCalledWith('replace_workflow_stages', {
      p_template_id: 't1',
      p_stages: [
        { id: undefined, name: 'Prep', color: '#fff', is_final: false },
        { id: 's2', name: 'Done', color: '#000', is_final: true },
      ],
    })
  })
})
```

```ts
// src/features/settings/data/orderType.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'ot1',
        name: 'Paper Printing',
        workflow_template_id: 't1',
        fixed_amount: 500,
        is_active: true,
        workflow_templates: { name: 'Printing' },
      },
    ],
    error: null,
  }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: state.order,
      upsert: state.upsert,
    })),
    rpc: state.rpc,
  },
}))

import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

describe('orderTypeRepository.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps rows and joins the workflow name', async () => {
    const result = await orderTypeRepository.list()
    expect(result).toEqual([
      {
        id: 'ot1',
        name: 'Paper Printing',
        workflowTemplateId: 't1',
        workflowName: 'Printing',
        fixedAmount: 500,
        isActive: true,
      },
    ])
  })
})

describe('orderTypeRepository.softDelete', () => {
  it('calls the soft_delete_order_type RPC', async () => {
    await orderTypeRepository.softDelete('ot1')
    expect(state.rpc).toHaveBeenCalledWith('soft_delete_order_type', { p_order_type_id: 'ot1' })
  })
})
```

- [ ] **Step 3: Run, expect failure**

Run: `npm test -- data/workflow.repository data/orderType.repository`

- [ ] **Step 4: Implement `workflow.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { WorkflowTemplateVM, WorkflowStageVM } from '@/features/settings/settings.types'

interface StageRow {
  id: string
  name: string
  sort_order: number
  color: string
  is_final: boolean
  deleted_at: string | null
}
interface TemplateRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  workflow_stages: StageRow[]
}

function mapTemplate(row: TemplateRow): WorkflowTemplateVM {
  const stages: WorkflowStageVM[] = row.workflow_stages
    .filter((s) => s.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ id: s.id, name: s.name, sortOrder: s.sort_order, color: s.color, isFinal: s.is_final }))
  return { id: row.id, name: row.name, description: row.description, isActive: row.is_active, stages }
}

export const workflowRepository = {
  async list(): Promise<WorkflowTemplateVM[]> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('id, name, description, is_active, workflow_stages(id, name, sort_order, color, is_final, deleted_at)')
      .is('deleted_at', null)
      .order('name')
    if (error) throw error
    return (data as unknown as TemplateRow[]).map(mapTemplate)
  },

  async upsertTemplate(input: {
    id?: string
    name: string
    description: string | null
    isActive: boolean
  }): Promise<string> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .upsert(
        input.id
          ? { id: input.id, name: input.name, description: input.description, is_active: input.isActive }
          : { name: input.name, description: input.description, is_active: input.isActive },
      )
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: string }).id
  },

  async saveStages(
    templateId: string,
    stages: { id?: string; name: string; color: string; isFinal: boolean }[],
  ): Promise<void> {
    const payload = stages.map((s) => ({ id: s.id, name: s.name, color: s.color, is_final: s.isFinal }))
    const { error } = await supabase.rpc('replace_workflow_stages', {
      p_template_id: templateId,
      p_stages: payload,
    })
    if (error) throw error
  },

  async softDeleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_workflow_template', { p_template_id: id })
    if (error) throw error
  },
}
```

- [ ] **Step 5: Implement `orderType.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { OrderTypeVM } from '@/features/settings/settings.types'

interface OrderTypeRow {
  id: string
  name: string
  workflow_template_id: string
  fixed_amount: number | null
  is_active: boolean
  workflow_templates: { name: string } | null
}

export const orderTypeRepository = {
  async list(): Promise<OrderTypeVM[]> {
    const { data, error } = await supabase
      .from('order_types')
      .select('id, name, workflow_template_id, fixed_amount, is_active, workflow_templates(name)')
      .is('deleted_at', null)
      .order('name')
    if (error) throw error
    return (data as unknown as OrderTypeRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      workflowTemplateId: r.workflow_template_id,
      workflowName: r.workflow_templates?.name ?? '—',
      fixedAmount: r.fixed_amount,
      isActive: r.is_active,
    }))
  },

  async upsert(input: {
    id?: string
    name: string
    workflowTemplateId: string
    fixedAmount: number | null
    isActive: boolean
  }): Promise<void> {
    const row = {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      workflow_template_id: input.workflowTemplateId,
      fixed_amount: input.fixedAmount,
      is_active: input.isActive,
    }
    const { error } = await supabase.from('order_types').upsert(row)
    if (error) throw error
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_order_type', { p_order_type_id: id })
    if (error) throw error
  },
}
```

- [ ] **Step 6: Run tests, typecheck**

Run: `npm test -- data/workflow.repository data/orderType.repository`, `npm run typecheck`
Expected: PASS / clean.

- [ ] **Step 7: Commit**

Report ready to commit: `feat(settings): add workflow and order-type repositories`

---

## Task 4: Query + mutation hooks

**Files:**
- Create: `src/features/settings/queries/useWorkflowTemplates.ts`
- Create: `src/features/settings/queries/useOrderTypes.ts`
- Create: `src/features/settings/mutations/useWorkflowMutations.ts`
- Create: `src/features/settings/mutations/useOrderTypeMutations.ts`

**Interfaces:**
- Consumes: `workflowRepository`, `orderTypeRepository` from Task 3.
- Produces:
  - `useWorkflowTemplates()` → `UseQueryResult<WorkflowTemplateVM[]>`, query key `['workflow_templates']`
  - `useOrderTypes()` → `UseQueryResult<OrderTypeVM[]>`, query key `['order_types']`
  - `useSaveWorkflow()` → mutation `{ template, stages } => Promise<string>` (upserts template then stages), invalidates `['workflow_templates']`
  - `useDeleteWorkflow()` → mutation `(id: string) => Promise<void>`, invalidates `['workflow_templates']`
  - `useSaveOrderType()` / `useDeleteOrderType()` — same shape for order types, invalidate `['order_types']`

- [ ] **Step 1: Implement query hooks**

```ts
// src/features/settings/queries/useWorkflowTemplates.ts
import { useQuery } from '@tanstack/react-query'
import { workflowRepository } from '@/features/settings/data/workflow.repository'

export function useWorkflowTemplates() {
  return useQuery({ queryKey: ['workflow_templates'], queryFn: workflowRepository.list })
}
```

```ts
// src/features/settings/queries/useOrderTypes.ts
import { useQuery } from '@tanstack/react-query'
import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

export function useOrderTypes() {
  return useQuery({ queryKey: ['order_types'], queryFn: orderTypeRepository.list })
}
```

- [ ] **Step 2: Implement mutation hooks**

```ts
// src/features/settings/mutations/useWorkflowMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowRepository } from '@/features/settings/data/workflow.repository'
import type { WorkflowStageVM } from '@/features/settings/settings.types'

interface SaveWorkflowInput {
  template: { id?: string; name: string; description: string | null; isActive: boolean }
  stages: Omit<WorkflowStageVM, 'sortOrder'>[]
}

export function useSaveWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveWorkflowInput) => {
      const id = await workflowRepository.upsertTemplate(input.template)
      await workflowRepository.saveStages(id, input.stages)
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow_templates'] }),
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowRepository.softDeleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow_templates'] }),
  })
}
```

```ts
// src/features/settings/mutations/useOrderTypeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

export function useSaveOrderType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: orderTypeRepository.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order_types'] }),
  })
}

export function useDeleteOrderType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => orderTypeRepository.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order_types'] }),
  })
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean. (Hooks are exercised indirectly by the component tests in Tasks 5–6; no standalone hook tests — thin wrappers over already-tested repositories.)

- [ ] **Step 4: Commit**

Report ready to commit: `feat(settings): add TanStack Query hooks for workflows and order types`

---

## Task 5: StageEditor + WorkflowFormModal + WorkflowList

**Files:**
- Create: `src/features/settings/components/StageEditor.tsx` (+ `.test.tsx`)
- Create: `src/features/settings/components/WorkflowFormModal.tsx` (+ `.test.tsx`)
- Create: `src/features/settings/components/WorkflowList.tsx`

**Interfaces:**
- Consumes: `WorkflowTemplateVM`, `WorkflowStageVM`, `useSaveWorkflow`, `useDeleteWorkflow`, `Card`/`Button`/`Modal`/`Field` from `shared/ui`.
- Produces: `StageEditor({ stages, onChange }: { stages: EditableStage[]; onChange: (s: EditableStage[]) => void })` where `EditableStage = { id?: string; name: string; color: string; isFinal: boolean }`. `WorkflowFormModal({ template?: WorkflowTemplateVM; onClose: () => void })`. `WorkflowList({ templates: WorkflowTemplateVM[]; canWrite: boolean; onEdit: (t) => void })`.

- [ ] **Step 1: Write `StageEditor` failing tests**

```tsx
// src/features/settings/components/StageEditor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StageEditor } from '@/features/settings/components/StageEditor'

const two = [
  { name: 'Prep', color: '#111', isFinal: false },
  { name: 'Done', color: '#222', isFinal: true },
]

describe('StageEditor', () => {
  it('adds a stage', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add stage/i }))
    expect(onChange).toHaveBeenCalledWith([...two, expect.objectContaining({ name: '', isFinal: false })])
  })

  it('moves a stage up', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: /move up/i })[1])
    expect(onChange).toHaveBeenCalledWith([two[1], two[0]])
  })

  it('marking a stage final clears the others', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('radio', { name: /final/i })[0])
    expect(onChange).toHaveBeenCalledWith([
      { ...two[0], isFinal: true },
      { ...two[1], isFinal: false },
    ])
  })

  it('deletes a stage', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: /delete stage/i })[0])
    expect(onChange).toHaveBeenCalledWith([two[1]])
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- StageEditor`

- [ ] **Step 3: Implement `StageEditor.tsx`**

```tsx
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'

export interface EditableStage {
  id?: string
  name: string
  color: string
  isFinal: boolean
}

const PALETTE = ['#5A7BFF', '#39C16C', '#F4B740', '#F45B69', '#8b5cf6', '#0ea5e9']

export function StageEditor({
  stages,
  onChange,
}: {
  stages: EditableStage[]
  onChange: (next: EditableStage[]) => void
}) {
  const update = (i: number, patch: Partial<EditableStage>) =>
    onChange(stages.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= stages.length) return
    const next = [...stages]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const remove = (i: number) => onChange(stages.filter((_, idx) => idx !== i))

  const add = () => onChange([...stages, { name: '', color: PALETTE[0], isFinal: false }])

  const setFinal = (i: number) => onChange(stages.map((s, idx) => ({ ...s, isFinal: idx === i })))

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-neo-text-primary)]">Stages</h3>
      {stages.map((s, i) => (
        <div key={s.id ?? `new-${i}`} className="flex items-center gap-2 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 shadow-[var(--shadow-neo-pressed)]">
          <select
            aria-label="Stage color"
            value={s.color}
            onChange={(e) => update(i, { color: e.target.value })}
            className="h-9 w-9 rounded-md border-0"
            style={{ background: s.color }}
          >
            {PALETTE.map((c) => (
              <option key={c} value={c} style={{ background: c }} />
            ))}
          </select>
          <div className="flex-1">
            <Field
              id={`stage-${i}`}
              label=""
              aria-label={`Stage ${i + 1} name`}
              placeholder="Stage name"
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-neo-text-secondary)]">
            <input
              type="radio"
              name="final-stage"
              aria-label="Final stage"
              checked={s.isFinal}
              onChange={() => setFinal(i)}
            />
            Final
          </label>
          <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 disabled:opacity-30">
            <ArrowUp size={16} />
          </button>
          <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="p-1.5 disabled:opacity-30">
            <ArrowDown size={16} />
          </button>
          <button type="button" aria-label="Delete stage" onClick={() => remove(i)} className="p-1.5 text-[var(--color-neo-danger)]">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={add}>
        Add stage
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- StageEditor`
Fix any mismatch between the test's expected call shape and the implementation (e.g. the "add" test expects the new stage to have `name: ''` — match `PALETTE[0]` for color in assertions if the test needs updating to be exact; prefer `expect.objectContaining` as already written).

- [ ] **Step 5: Write `WorkflowFormModal` failing tests**

```tsx
// src/features/settings/components/WorkflowFormModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue('t1') }))
vi.mock('@/features/settings/mutations/useWorkflowMutations', () => ({
  useSaveWorkflow: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { WorkflowFormModal } from '@/features/settings/components/WorkflowFormModal'

describe('WorkflowFormModal', () => {
  it('disables save until there is a name, a stage, and one final stage', async () => {
    render(<WorkflowFormModal onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('saves a valid workflow', async () => {
    render(<WorkflowFormModal onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/workflow name/i), 'Printing')
    await userEvent.click(screen.getByRole('button', { name: /add stage/i }))
    await userEvent.type(screen.getByLabelText(/stage 1 name/i), 'Prep')
    await userEvent.click(screen.getByLabelText(/final stage/i))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({ name: 'Printing' }),
        stages: [expect.objectContaining({ name: 'Prep', isFinal: true })],
      }),
    )
  })
})
```

- [ ] **Step 6: Run, expect failure**

Run: `npm test -- WorkflowFormModal`

- [ ] **Step 7: Implement `WorkflowFormModal.tsx`**

```tsx
import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { StageEditor, type EditableStage } from '@/features/settings/components/StageEditor'
import { useSaveWorkflow } from '@/features/settings/mutations/useWorkflowMutations'
import type { WorkflowTemplateVM } from '@/features/settings/settings.types'

export function WorkflowFormModal({
  template,
  onClose,
}: {
  template?: WorkflowTemplateVM
  onClose: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [stages, setStages] = useState<EditableStage[]>(
    template?.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, isFinal: s.isFinal })) ?? [],
  )
  const { mutateAsync, isPending } = useSaveWorkflow()
  const { show } = useToast()

  const finalCount = stages.filter((s) => s.isFinal).length
  const canSave =
    name.trim().length > 0 &&
    stages.length > 0 &&
    stages.every((s) => s.name.trim().length > 0) &&
    finalCount === 1

  const onSave = async () => {
    try {
      await mutateAsync({ template: { id: template?.id, name, description: description || null, isActive }, stages })
      show({ type: 'success', title: template ? 'Workflow updated' : 'Workflow created' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save workflow', message: (err as Error).message })
    }
  }

  return (
    <Modal open onClose={onClose} title={template ? 'Edit workflow' : 'Create workflow'}>
      <Field id="workflow-name" label="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        id="workflow-description"
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="mb-4 flex items-center gap-2 text-sm text-[var(--color-neo-text-primary)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <StageEditor stages={stages} onChange={setStages} />
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!canSave || isPending} onClick={onSave}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 8: Run, expect pass**

Run: `npm test -- WorkflowFormModal`

- [ ] **Step 9: Implement `WorkflowList.tsx`**

```tsx
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { WorkflowTemplateVM } from '@/features/settings/settings.types'

export function WorkflowList({
  templates,
  canWrite,
  onEdit,
  onDelete,
}: {
  templates: WorkflowTemplateVM[]
  canWrite: boolean
  onEdit: (t: WorkflowTemplateVM) => void
  onDelete: (t: WorkflowTemplateVM) => void
}) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-[var(--color-neo-text-secondary)]">
        No workflows yet — create one to define how an order type progresses.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-[var(--color-neo-text-primary)]">{t.name}</h4>
                <StatusBadge label={t.isActive ? 'Active' : 'Inactive'} color={t.isActive ? 'var(--color-neo-success)' : 'var(--color-neo-secondary)'} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.stages.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neo-bg)] px-2 py-0.5 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                    {s.isFinal && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
            {canWrite && (
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(t)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 10: Typecheck, lint, commit**

Run: `npm run typecheck`, `npm run lint`
Report ready to commit: `feat(settings): add StageEditor, WorkflowFormModal, WorkflowList`

---

## Task 6: OrderTypeFormModal + OrderTypeList

**Files:**
- Create: `src/features/settings/components/OrderTypeFormModal.tsx` (+ `.test.tsx`)
- Create: `src/features/settings/components/OrderTypeList.tsx`

**Interfaces:**
- Consumes: `OrderTypeVM`, `WorkflowTemplateVM[]` (for the picker), `useSaveOrderType`, `useDeleteOrderType`.
- Produces: `OrderTypeFormModal({ orderType?: OrderTypeVM; workflows: WorkflowTemplateVM[]; onClose: () => void })`; `OrderTypeList({ orderTypes: OrderTypeVM[]; canWrite: boolean; onEdit; onDelete })`.

- [ ] **Step 1: Write failing test**

```tsx
// src/features/settings/components/OrderTypeFormModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/features/settings/mutations/useOrderTypeMutations', () => ({
  useSaveOrderType: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { OrderTypeFormModal } from '@/features/settings/components/OrderTypeFormModal'

const workflows = [
  { id: 'w1', name: 'Printing', description: null, isActive: true, stages: [] },
]

describe('OrderTypeFormModal', () => {
  it('requires a name and a workflow before saving', () => {
    render(<OrderTypeFormModal workflows={workflows} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('saves with the picked workflow and optional amount', async () => {
    render(<OrderTypeFormModal workflows={workflows} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Paper Printing')
    await userEvent.selectOptions(screen.getByLabelText(/workflow/i), 'w1')
    await userEvent.type(screen.getByLabelText(/fixed amount/i), '500')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Paper Printing', workflowTemplateId: 'w1', fixedAmount: 500 }),
    )
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- OrderTypeFormModal`

- [ ] **Step 3: Implement `OrderTypeFormModal.tsx`**

```tsx
import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useSaveOrderType } from '@/features/settings/mutations/useOrderTypeMutations'
import type { OrderTypeVM, WorkflowTemplateVM } from '@/features/settings/settings.types'

export function OrderTypeFormModal({
  orderType,
  workflows,
  onClose,
}: {
  orderType?: OrderTypeVM
  workflows: WorkflowTemplateVM[]
  onClose: () => void
}) {
  const [name, setName] = useState(orderType?.name ?? '')
  const [workflowTemplateId, setWorkflowTemplateId] = useState(orderType?.workflowTemplateId ?? '')
  const [fixedAmount, setFixedAmount] = useState(orderType?.fixedAmount?.toString() ?? '')
  const [isActive, setIsActive] = useState(orderType?.isActive ?? true)
  const { mutateAsync, isPending } = useSaveOrderType()
  const { show } = useToast()

  const activeWorkflows = workflows.filter((w) => w.isActive)
  const canSave = name.trim().length > 0 && workflowTemplateId.length > 0

  const onSave = async () => {
    try {
      await mutateAsync({
        id: orderType?.id,
        name,
        workflowTemplateId,
        fixedAmount: fixedAmount === '' ? null : Number(fixedAmount),
        isActive,
      })
      show({ type: 'success', title: orderType ? 'Order type updated' : 'Order type created' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save order type', message: (err as Error).message })
    }
  }

  return (
    <Modal open onClose={onClose} title={orderType ? 'Edit order type' : 'Create order type'}>
      <Field id="order-type-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="mb-4">
        <label htmlFor="workflow-select" className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]">
          Workflow
        </label>
        <select
          id="workflow-select"
          value={workflowTemplateId}
          onChange={(e) => setWorkflowTemplateId(e.target.value)}
          className="h-10 w-full rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] px-3 text-sm shadow-[var(--shadow-neo-pressed)]"
        >
          <option value="">Select a workflow…</option>
          {activeWorkflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {activeWorkflows.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
            No active workflows yet — create one on the Workflows tab first.
          </p>
        )}
      </div>

      <Field
        id="fixed-amount"
        label="Fixed amount (optional)"
        type="number"
        min="0"
        value={fixedAmount}
        onChange={(e) => setFixedAmount(e.target.value)}
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-[var(--color-neo-text-primary)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!canSave || isPending} onClick={onSave}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- OrderTypeFormModal`

- [ ] **Step 5: Implement `OrderTypeList.tsx`**

```tsx
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { OrderTypeVM } from '@/features/settings/settings.types'

export function OrderTypeList({
  orderTypes,
  canWrite,
  onEdit,
  onDelete,
}: {
  orderTypes: OrderTypeVM[]
  canWrite: boolean
  onEdit: (o: OrderTypeVM) => void
  onDelete: (o: OrderTypeVM) => void
}) {
  if (orderTypes.length === 0) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">No order types yet.</p>
  }

  return (
    <div className="space-y-3">
      {orderTypes.map((o) => (
        <Card key={o.id} className="flex items-center justify-between p-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-[var(--color-neo-text-primary)]">{o.name}</h4>
              <StatusBadge label={o.isActive ? 'Active' : 'Inactive'} color={o.isActive ? 'var(--color-neo-success)' : 'var(--color-neo-secondary)'} />
            </div>
            <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
              {o.workflowName} · {formatCurrency(o.fixedAmount)}
            </p>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(o)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(o)}>
                Delete
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Typecheck, lint, commit**

Run: `npm run typecheck`, `npm run lint`
Report ready to commit: `feat(settings): add OrderTypeFormModal and OrderTypeList`

---

## Task 7: SettingsPage — tab shell wiring everything

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx` (replaces the Phase 1 placeholder)
- Create: `src/features/settings/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `useWorkflowTemplates`, `useOrderTypes`, `useDeleteWorkflow`, `useDeleteOrderType`, `useRole`, `WorkflowList`, `OrderTypeList`, `WorkflowFormModal`, `OrderTypeFormModal`, `Modal`.
- Produces: default export `SettingsPage` used by `AppRouter` (already wired to `/settings` in Phase 1 — only the file contents change).

- [ ] **Step 1: Write failing tests**

```tsx
// src/features/settings/SettingsPage.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const templates = [{ id: 't1', name: 'Printing', description: null, isActive: true, stages: [] }]
const orderTypes = [
  { id: 'ot1', name: 'Paper Printing', workflowTemplateId: 't1', workflowName: 'Printing', fixedAmount: null, isActive: true },
]

vi.mock('@/features/settings/queries/useWorkflowTemplates', () => ({
  useWorkflowTemplates: () => ({ data: templates, isLoading: false, isError: false }),
}))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({
  useOrderTypes: () => ({ data: orderTypes, isLoading: false, isError: false }),
}))
vi.mock('@/features/settings/mutations/useWorkflowMutations', () => ({
  useDeleteWorkflow: () => ({ mutateAsync: vi.fn() }),
  useSaveWorkflow: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/settings/mutations/useOrderTypeMutations', () => ({
  useDeleteOrderType: () => ({ mutateAsync: vi.fn() }),
  useSaveOrderType: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

function mockRole(isAdmin: boolean) {
  vi.doMock('@/core/auth/auth.hooks', () => ({
    useRole: () => ({ isAdmin, isStaff: true, isCustomer: false, profile: null, loading: false }),
  }))
}

describe('SettingsPage', () => {
  it('hides write controls for a non-admin staff member', async () => {
    vi.resetModules()
    mockRole(false)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Printing')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new workflow/i })).not.toBeInTheDocument()
  })

  it('shows write controls for an admin', async () => {
    vi.resetModules()
    mockRole(true)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /new workflow/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- SettingsPage`

- [ ] **Step 3: Implement `SettingsPage.tsx`**

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { useRole } from '@/core/auth/auth.hooks'
import { useWorkflowTemplates } from '@/features/settings/queries/useWorkflowTemplates'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { useDeleteWorkflow } from '@/features/settings/mutations/useWorkflowMutations'
import { useDeleteOrderType } from '@/features/settings/mutations/useOrderTypeMutations'
import { WorkflowList } from '@/features/settings/components/WorkflowList'
import { WorkflowFormModal } from '@/features/settings/components/WorkflowFormModal'
import { OrderTypeList } from '@/features/settings/components/OrderTypeList'
import { OrderTypeFormModal } from '@/features/settings/components/OrderTypeFormModal'
import type { WorkflowTemplateVM, OrderTypeVM } from '@/features/settings/settings.types'

type Tab = 'workflows' | 'order-types'

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'order-types' ? 'order-types' : 'workflows'
  const { isAdmin } = useRole()
  const { show } = useToast()

  const workflowsQuery = useWorkflowTemplates()
  const orderTypesQuery = useOrderTypes()
  const deleteWorkflow = useDeleteWorkflow()
  const deleteOrderType = useDeleteOrderType()

  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplateVM | 'new' | null>(null)
  const [editingOrderType, setEditingOrderType] = useState<OrderTypeVM | 'new' | null>(null)
  const [confirmDeleteWorkflow, setConfirmDeleteWorkflow] = useState<WorkflowTemplateVM | null>(null)
  const [confirmDeleteOrderType, setConfirmDeleteOrderType] = useState<OrderTypeVM | null>(null)

  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })

  const runDeleteWorkflow = async () => {
    if (!confirmDeleteWorkflow) return
    try {
      await deleteWorkflow.mutateAsync(confirmDeleteWorkflow.id)
      show({ type: 'success', title: 'Workflow deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete workflow', message: (err as Error).message })
    } finally {
      setConfirmDeleteWorkflow(null)
    }
  }

  const runDeleteOrderType = async () => {
    if (!confirmDeleteOrderType) return
    try {
      await deleteOrderType.mutateAsync(confirmDeleteOrderType.id)
      show({ type: 'success', title: 'Order type deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete order type', message: (err as Error).message })
    } finally {
      setConfirmDeleteOrderType(null)
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            Configure how orders move through your business.
          </p>
        </div>
        {isAdmin && tab === 'workflows' && (
          <Button icon={<Plus size={16} />} onClick={() => setEditingWorkflow('new')}>
            New workflow
          </Button>
        )}
        {isAdmin && tab === 'order-types' && (
          <Button icon={<Plus size={16} />} onClick={() => setEditingOrderType('new')}>
            New order type
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[var(--color-neo-secondary)]/20">
        {(['workflows', 'order-types'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'border-b-2 border-[var(--color-neo-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-neo-primary)]'
                : 'px-3 py-2 text-sm font-medium text-[var(--color-neo-text-secondary)]'
            }
          >
            {t === 'workflows' ? 'Workflows' : 'Order Types'}
          </button>
        ))}
      </div>

      {tab === 'workflows' &&
        (workflowsQuery.isLoading ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
        ) : workflowsQuery.isError ? (
          <p className="text-sm text-[var(--color-neo-danger)]">Could not load workflows.</p>
        ) : (
          <WorkflowList
            templates={workflowsQuery.data ?? []}
            canWrite={isAdmin}
            onEdit={setEditingWorkflow}
            onDelete={setConfirmDeleteWorkflow}
          />
        ))}

      {tab === 'order-types' &&
        (orderTypesQuery.isLoading ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
        ) : orderTypesQuery.isError ? (
          <p className="text-sm text-[var(--color-neo-danger)]">Could not load order types.</p>
        ) : (
          <OrderTypeList
            orderTypes={orderTypesQuery.data ?? []}
            canWrite={isAdmin}
            onEdit={setEditingOrderType}
            onDelete={setConfirmDeleteOrderType}
          />
        ))}

      {editingWorkflow && (
        <WorkflowFormModal
          template={editingWorkflow === 'new' ? undefined : editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
        />
      )}
      {editingOrderType && (
        <OrderTypeFormModal
          orderType={editingOrderType === 'new' ? undefined : editingOrderType}
          workflows={workflowsQuery.data ?? []}
          onClose={() => setEditingOrderType(null)}
        />
      )}

      <Modal open={!!confirmDeleteWorkflow} onClose={() => setConfirmDeleteWorkflow(null)} title="Delete workflow?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          This deletes "{confirmDeleteWorkflow?.name}". If any order type still uses it, deletion is blocked.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDeleteWorkflow(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={runDeleteWorkflow}>
            Delete
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmDeleteOrderType} onClose={() => setConfirmDeleteOrderType(null)} title="Delete order type?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          This deletes "{confirmDeleteOrderType?.name}".
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDeleteOrderType(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={runDeleteOrderType}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- SettingsPage`

- [ ] **Step 5: Full verification**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected: all clean; test count higher than Phase 1's 26.

- [ ] **Step 6: Commit**

Report ready to commit: `feat(settings): wire SettingsPage tabs to workflows and order types`

---

## Task 8: Manual verification with seeded users

**Files:** none (verification only).

- [ ] **Step 1: Reset DB, start dev server**

Run: `supabase db reset`, `npm run dev`

- [ ] **Step 2: Admin flow**

Log in as `admin@onevo.test` / `password123`. On `/settings?tab=workflows`:
create a workflow with 3 stages (reorder one, mark the last final), save; edit it
and change a stage name; go to `/settings?tab=order-types`, create an order
type linked to it with a fixed amount, save; attempt to delete the workflow
(expect the blocked message naming the order type); delete the order type, then
the workflow (expect success).

- [ ] **Step 3: Employee flow**

Log in as `staff@onevo.test` / `password123`. Confirm both tabs show data with
no New/Edit/Delete buttons.

- [ ] **Step 4: Report results**

Note any deviation from the spec's Definition of Done (§9) before considering
Phase 2 complete.

---

## Self-Review

**1. Spec coverage** — §2 screens (Task 5–7), §4 RPCs (Task 1), §5 architecture
(Tasks 3–4), §6 UX detail (Tasks 5–7), §7 currency (Task 2), §8 testing (every
task has its test), §9 DoD (Task 8 + the running `npm test`/`build` checks
threaded through every task). No gap without a task.

**2. Placeholder scan** — no TBD/TODO; all code blocks are complete, runnable.

**3. Type consistency** — `WorkflowStageVM`/`WorkflowTemplateVM`/`OrderTypeVM`
(Task 3) are the only shapes used in Tasks 4–7. `EditableStage` (Task 5) is a
strict subset used consistently in `StageEditor` and `WorkflowFormModal`.
Repository method names (`upsertTemplate`, `saveStages`, `softDeleteTemplate`,
`upsert`, `softDelete`) match between Task 3's implementation and Task 4's hooks
verbatim. RPC names (`replace_workflow_stages`, `soft_delete_workflow_template`,
`soft_delete_order_type`) match between Task 1 (SQL), Task 3 (repository calls),
and the spec §4.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-01-onevo-phase-2-admin-config.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
