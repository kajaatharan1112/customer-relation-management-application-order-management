# ONEVO Phase 3 (Customers + Bills) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the staff-side CRUD for customers and bills — add/edit/search/delete customers (each with a login), create bills with repeatable order rows and a live total, and a bill detail page with total/paid/balance, a status control, and payment recording.

**Architecture:** One migration adds four `security definer` RPCs (`save_bill` writes a bill + its rows atomically; `set_bill_status`, `soft_delete_bill`, `soft_delete_customer` are guarded mutations). Two new frontend modules — `features/customers/` and `features/bills/` — follow the Phase 2 repository → query-hook → mutation-hook → component pattern. `customer.repository.createWithLogin` invokes the Phase 1 `admin-create-user` edge function then patches the detail fields. A new `/bills/:id` route renders the detail page under the staff `AppLayout`.

**Tech Stack:** Same as Phases 1–2 — React 19, TypeScript, TanStack Query, React Hook Form + Zod (forms), Tailwind v4 neo tokens, Supabase (Postgres RPC + RLS + Edge Functions).

**Spec:** `docs/superpowers/specs/2026-09-01-onevo-phase-3-customers-bills-design.md`

## Global Constraints

- Do not modify migrations `0001`–`0005`; add `0006_customer_bill_rpcs.sql`.
- All Supabase access (`from` / `rpc` / `functions.invoke`) lives in `features/*/data/*.repository.ts` — never in components or hooks.
- View models are camelCase; DB rows stay snake_case until mapped.
- Bills/customers are **not** admin-gated in Phase 3 — `is_staff()` (admin_member **or** employee) is the boundary, enforced by RLS and the RPCs.
- `formatCurrency` (from Phase 2) for every money value; `LKR` default.
- Soft delete only; the RPCs enforce referential rules (customer with bills can't be deleted).
- **Do NOT run git.** End each task with `ready to commit: <msg>`; the user commits.
- Local SQL tests: `docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < file.sql`. Supabase CLI needs `/c/Users/User/scoop/shims` on PATH. Seeded logins: `admin@onevo.test` / `staff@onevo.test` / `customer@onevo.test`, password `password123`.
- Vitest `test.include` is already scoped to `src/` — SQL/Deno test files are ignored by it.

---

## File Structure

```
supabase/
├── migrations/0006_customer_bill_rpcs.sql
└── tests/customer_bill_rpcs.test.sql

src/
├── app/router/AppRouter.tsx                        (MODIFY: add /bills/:id)
├── shared/constants/routes.ts                       (MODIFY: add billDetail)
└── features/
    ├── customers/
    │   ├── customers.types.ts
    │   ├── data/customer.repository.ts (+ .test.ts)
    │   ├── queries/useCustomers.ts
    │   ├── mutations/useCustomerMutations.ts
    │   ├── components/
    │   │   ├── CustomerList.tsx
    │   │   └── CustomerFormModal.tsx (+ .test.tsx)
    │   └── CustomersPage.tsx (+ .test.tsx)          (replaces placeholder)
    └── bills/
        ├── bills.types.ts
        ├── data/bill.repository.ts (+ .test.ts)
        ├── queries/useBills.ts
        ├── mutations/useBillMutations.ts
        ├── components/
        │   ├── BillList.tsx
        │   ├── BillRowsEditor.tsx (+ .test.tsx)
        │   ├── BillFormModal.tsx (+ .test.tsx)
        │   ├── BillStatusControl.tsx (+ .test.tsx)
        │   └── RecordPaymentModal.tsx
        ├── BillsPage.tsx (+ .test.tsx)              (replaces placeholder)
        └── BillDetailPage.tsx
```

---

## Task 1: Migration 0006 — customer + bill RPCs

**Files:**
- Create: `supabase/migrations/0006_customer_bill_rpcs.sql`
- Test: `supabase/tests/customer_bill_rpcs.test.sql`

**Interfaces:**
- Produces: `public.save_bill(p_bill jsonb, p_rows jsonb) returns uuid`, `public.set_bill_status(p_bill_id uuid, p_status_key text) returns void`, `public.soft_delete_bill(p_bill_id uuid) returns void`, `public.soft_delete_customer(p_profile_id uuid) returns void`.

- [ ] **Step 1: Write the migration**

```sql
-- 0006_customer_bill_rpcs.sql

create or replace function public.save_bill(p_bill jsonb, p_rows jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_bill_id uuid;
  v_item jsonb;
  v_idx int := 0;
  v_row_id uuid;
  v_keep uuid[] := '{}';
begin
  if not public.is_staff() then
    raise exception 'only staff can save bills';
  end if;

  v_bill_id := nullif(p_bill->>'id', '')::uuid;

  if v_bill_id is null then
    insert into public.bills (customer_id, order_date, deadline, notes, paid_amount, created_by)
    values (
      (p_bill->>'customer_id')::uuid,
      coalesce((p_bill->>'order_date')::date, current_date),
      nullif(p_bill->>'deadline', '')::date,
      p_bill->>'notes',
      coalesce((p_bill->>'paid_amount')::numeric, 0),
      public.current_profile()
    )
    returning id into v_bill_id;
  else
    update public.bills set
      customer_id = (p_bill->>'customer_id')::uuid,
      order_date  = coalesce((p_bill->>'order_date')::date, order_date),
      deadline    = nullif(p_bill->>'deadline', '')::date,
      notes       = p_bill->>'notes'
    where id = v_bill_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_rows)
  loop
    v_row_id := nullif(v_item->>'id', '')::uuid;

    if v_row_id is not null and exists (
      select 1 from public.bill_rows where id = v_row_id and bill_id = v_bill_id
    ) then
      update public.bill_rows set
        detail = v_item->>'detail',
        order_type_id = nullif(v_item->>'order_type_id', '')::uuid,
        amount = coalesce((v_item->>'amount')::numeric, 0),
        sort_order = v_idx,
        deleted_at = null
      where id = v_row_id;
    else
      insert into public.bill_rows (bill_id, detail, order_type_id, amount, sort_order)
      values (
        v_bill_id,
        v_item->>'detail',
        nullif(v_item->>'order_type_id', '')::uuid,
        coalesce((v_item->>'amount')::numeric, 0),
        v_idx
      )
      returning id into v_row_id;
    end if;

    v_keep := v_keep || v_row_id;
    v_idx := v_idx + 1;
  end loop;

  update public.bill_rows set deleted_at = now()
  where bill_id = v_bill_id and deleted_at is null and not (id = any(v_keep));

  return v_bill_id;
end $$;

create or replace function public.set_bill_status(p_bill_id uuid, p_status_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_status_id uuid;
begin
  if not public.is_staff() then
    raise exception 'only staff can change bill status';
  end if;
  select id into v_status_id from public.bill_statuses where key = p_status_key;
  if v_status_id is null then
    raise exception 'unknown bill status: %', p_status_key;
  end if;
  update public.bills set bill_status_id = v_status_id where id = p_bill_id;
end $$;

create or replace function public.soft_delete_bill(p_bill_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'only staff can delete bills';
  end if;
  update public.bills set deleted_at = now() where id = p_bill_id;
  update public.bill_rows set deleted_at = now() where bill_id = p_bill_id and deleted_at is null;
end $$;

create or replace function public.soft_delete_customer(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_bill_count int;
begin
  if not public.is_staff() then
    raise exception 'only staff can delete customers';
  end if;
  select count(*) into v_bill_count from public.bills
  where customer_id = p_profile_id and deleted_at is null;
  if v_bill_count > 0 then
    raise exception 'cannot delete: customer has % active bill(s)', v_bill_count;
  end if;
  update public.customers set deleted_at = now() where profile_id = p_profile_id;
  update public.profiles set status = 'disabled' where id = p_profile_id;
end $$;
```

- [ ] **Step 2: Apply**

Run: `supabase db reset`
Expected: `0001`–`0006` apply, then `supabase/seed.sql` re-seeds the 3 users.

- [ ] **Step 3: Write `supabase/tests/customer_bill_rpcs.test.sql`**

```sql
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'stf@t.co', '{"user_type":"employee"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'cst@t.co', '{"user_type":"customer"}');

-- workflow + order type so a tagged row gets an initial stage
insert into public.workflow_templates (id, name) values ('00000000-0000-0000-0000-0000000c0001', 'W');
insert into public.workflow_stages (id, template_id, name, sort_order) values
  ('00000000-0000-0000-0000-00000c00a001', '00000000-0000-0000-0000-0000000c0001', 'S1', 1);
insert into public.order_types (id, name, workflow_template_id, fixed_amount)
values ('00000000-0000-0000-0000-0000000d0001', 'OT', '00000000-0000-0000-0000-0000000c0001', 250);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

-- save_bill: new bill + 2 rows
select public.save_bill(
  jsonb_build_object('customer_id', '00000000-0000-0000-0000-0000000000f2', 'notes', 'hi'),
  jsonb_build_array(
    jsonb_build_object('detail', 'Design', 'order_type_id', '00000000-0000-0000-0000-0000000d0001', 'amount', 250),
    jsonb_build_object('detail', 'Discount', 'amount', -50)
  )
) as bill_id \gset

select (bill_number ~ '^INV-[0-9]{6}$') as number_ok,
       (bill_status_id = (select id from public.bill_statuses where key='pending')) as status_ok
from public.bills where id = :'bill_id';

select count(*) = 2 as rows_ok,
       sum(amount) = 200 as total_ok,
       bool_or(current_stage_id = '00000000-0000-0000-0000-00000c00a001') as stage_set_ok
from public.bill_rows where bill_id = :'bill_id' and deleted_at is null;

-- re-save with one row dropped
select public.save_bill(
  jsonb_build_object('id', :'bill_id', 'customer_id', '00000000-0000-0000-0000-0000000000f2'),
  jsonb_build_array(jsonb_build_object('detail', 'Design only', 'amount', 300))
);
select count(*) = 1 as after_resave_ok from public.bill_rows where bill_id = :'bill_id' and deleted_at is null;

-- set_bill_status
select public.set_bill_status(:'bill_id', 'active');
select (bs.key = 'active') as status_changed_ok
from public.bills b join public.bill_statuses bs on bs.id = b.bill_status_id where b.id = :'bill_id';

do $$
begin
  begin
    perform public.set_bill_status('00000000-0000-0000-0000-0000000000f1'::uuid, 'nope');
    raise exception 'FAIL: accepted bad status key';
  exception when others then
    if sqlerrm like '%unknown bill status%' then raise notice 'OK: bad status rejected';
    else raise; end if;
  end;
end $$;

-- soft_delete_customer blocked while a bill exists
do $$
begin
  begin
    perform public.soft_delete_customer('00000000-0000-0000-0000-0000000000f2');
    raise exception 'FAIL: deleted a customer with a bill';
  exception when others then
    if sqlerrm like '%active bill%' then raise notice 'OK: customer delete blocked';
    else raise; end if;
  end;
end $$;

-- delete the bill, then the customer delete works
select public.soft_delete_bill(:'bill_id');
select public.soft_delete_customer('00000000-0000-0000-0000-0000000000f2');
select (deleted_at is not null) as customer_deleted from public.customers where profile_id = '00000000-0000-0000-0000-0000000000f2';

-- non-staff rejected
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
do $$
begin
  begin
    perform public.save_bill('{"customer_id":"00000000-0000-0000-0000-0000000000f2"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: customer saved a bill';
  exception when others then
    if sqlerrm like '%only staff%' then raise notice 'OK: customer blocked from save_bill';
    else raise; end if;
  end;
end $$;

reset role;
rollback;
```

- [ ] **Step 4: Run**

Run: `docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/customer_bill_rpcs.test.sql`
Expected: `number_ok`/`status_ok`/`rows_ok`/`total_ok`/`stage_set_ok`/`after_resave_ok`/`status_changed_ok`/`customer_deleted` all `t`; three `OK:` notices.

- [ ] **Step 5: Commit**

Report ready to commit: `feat(db): add save_bill and customer/bill guard RPCs`

---

## Task 2: Regenerate DB types

**Files:**
- Modify: `src/core/supabase/database.types.ts`

- [ ] **Step 1: Regenerate**

Run: `supabase gen types typescript --local > src/core/supabase/database.types.ts`

- [ ] **Step 2: Verify**

Run: `grep -c "save_bill\|set_bill_status\|soft_delete_bill\|soft_delete_customer" src/core/supabase/database.types.ts` — expect `4`.
Run: `npm run typecheck` — clean.

- [ ] **Step 3: Commit**

Report ready to commit: `chore(db): regenerate types for phase 3 RPCs`

---

## Task 3: Customers — types, repository, hooks

**Files:**
- Create: `src/features/customers/customers.types.ts`
- Create: `src/features/customers/data/customer.repository.ts` (+ `.test.ts`)
- Create: `src/features/customers/queries/useCustomers.ts`
- Create: `src/features/customers/mutations/useCustomerMutations.ts`

**Interfaces:**
- Produces:
  - `CustomerVM` (spec §4).
  - `customerRepository.list(): Promise<CustomerVM[]>`
  - `customerRepository.createWithLogin(input: { fullName; email; phone; tempPassword; companyName; addressLine; city; notes }): Promise<void>` — invokes `admin-create-user` then `updateDetail`.
  - `customerRepository.updateDetail(profileId: string, input: { fullName; phone; companyName; addressLine; city; notes }): Promise<void>` — updates `profiles.full_name`/`phone` and the `customers` row.
  - `customerRepository.softDelete(profileId: string): Promise<void>` — `rpc('soft_delete_customer')`.
  - `useCustomers()` → `['customers']`.
  - `useCreateCustomer()` / `useUpdateCustomer()` / `useDeleteCustomer()` — invalidate `['customers']`.

- [ ] **Step 1: Write `customers.types.ts`**

```ts
export interface CustomerVM {
  profileId: string
  fullName: string
  email: string
  phone: string | null
  companyName: string | null
  addressLine: string | null
  city: string | null
  notes: string | null
  billCount: number
}
```

- [ ] **Step 2: Write failing repository test**

```ts
// src/features/customers/data/customer.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        profile_id: 'p1',
        company_name: 'Acme',
        address_line: '1 St',
        city: 'Colombo',
        notes: null,
        profiles: { full_name: 'Cara', email: 'cara@x.co', phone: '123' },
        bills: [{ count: 2 }],
      },
    ],
    error: null,
  }),
  invoke: vi.fn().mockResolvedValue({ data: { user_id: 'newid' }, error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      update: vi.fn(() => ({ eq: h.eq })),
    })),
    functions: { invoke: h.invoke },
    rpc: h.rpc,
  },
}))

import { customerRepository } from '@/features/customers/data/customer.repository'

describe('customerRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows and bill count', async () => {
    const r = await customerRepository.list()
    expect(r).toEqual([
      {
        profileId: 'p1',
        fullName: 'Cara',
        email: 'cara@x.co',
        phone: '123',
        companyName: 'Acme',
        addressLine: '1 St',
        city: 'Colombo',
        notes: null,
        billCount: 2,
      },
    ])
  })

  it('createWithLogin invokes the edge function then updates detail', async () => {
    await customerRepository.createWithLogin({
      fullName: 'New Person',
      email: 'np@x.co',
      phone: '9',
      tempPassword: 'secret123',
      companyName: 'Co',
      addressLine: null,
      city: null,
      notes: null,
    })
    expect(h.invoke).toHaveBeenCalledWith('admin-create-user', {
      body: {
        email: 'np@x.co',
        full_name: 'New Person',
        phone: '9',
        user_type: 'customer',
        temp_password: 'secret123',
      },
    })
  })

  it('softDelete calls the rpc', async () => {
    await customerRepository.softDelete('p1')
    expect(h.rpc).toHaveBeenCalledWith('soft_delete_customer', { p_profile_id: 'p1' })
  })
})
```

- [ ] **Step 3: Run, expect failure.** `npm test -- customer.repository`

- [ ] **Step 4: Implement `customer.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { CustomerVM } from '@/features/customers/customers.types'

interface CustomerRow {
  profile_id: string
  company_name: string | null
  address_line: string | null
  city: string | null
  notes: string | null
  profiles: { full_name: string; email: string; phone: string | null } | null
  bills: { count: number }[]
}

export const customerRepository = {
  async list(): Promise<CustomerVM[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(
        'profile_id, company_name, address_line, city, notes, profiles(full_name, email, phone), bills(count)',
      )
      .is('deleted_at', null)
      .order('company_name', { nullsFirst: false })
    if (error) throw error
    return (data as unknown as CustomerRow[]).map((r) => ({
      profileId: r.profile_id,
      fullName: r.profiles?.full_name ?? '',
      email: r.profiles?.email ?? '',
      phone: r.profiles?.phone ?? null,
      companyName: r.company_name,
      addressLine: r.address_line,
      city: r.city,
      notes: r.notes,
      billCount: r.bills?.[0]?.count ?? 0,
    }))
  },

  async createWithLogin(input: {
    fullName: string
    email: string
    phone: string
    tempPassword: string
    companyName: string | null
    addressLine: string | null
    city: string | null
    notes: string | null
  }): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        user_type: 'customer',
        temp_password: input.tempPassword,
      },
    })
    if (error) throw error
    const userId = (data as { user_id: string }).user_id
    await customerRepository.updateDetail(userId, {
      fullName: input.fullName,
      phone: input.phone,
      companyName: input.companyName,
      addressLine: input.addressLine,
      city: input.city,
      notes: input.notes,
    })
  },

  async updateDetail(
    profileId: string,
    input: {
      fullName: string
      phone: string
      companyName: string | null
      addressLine: string | null
      city: string | null
      notes: string | null
    },
  ): Promise<void> {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone })
      .eq('id', profileId)
    if (pErr) throw pErr
    const { error: cErr } = await supabase
      .from('customers')
      .update({
        company_name: input.companyName,
        address_line: input.addressLine,
        city: input.city,
        notes: input.notes,
      })
      .eq('profile_id', profileId)
    if (cErr) throw cErr
  },

  async softDelete(profileId: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_customer', { p_profile_id: profileId })
    if (error) throw error
  },
}
```

- [ ] **Step 5: Implement the hooks** (mirror Phase 2 exactly)

```ts
// queries/useCustomers.ts
import { useQuery } from '@tanstack/react-query'
import { customerRepository } from '@/features/customers/data/customer.repository'
export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: customerRepository.list })
}
```

```ts
// mutations/useCustomerMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customerRepository } from '@/features/customers/data/customer.repository'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['customers'] })
}

export function useCreateCustomer() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: customerRepository.createWithLogin, onSuccess: inv })
}
export function useUpdateCustomer() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { profileId: string; input: Parameters<typeof customerRepository.updateDetail>[1] }) =>
      customerRepository.updateDetail(v.profileId, v.input),
    onSuccess: inv,
  })
}
export function useDeleteCustomer() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (profileId: string) => customerRepository.softDelete(profileId), onSuccess: inv })
}
```

- [ ] **Step 6: Run tests + typecheck.** `npm test -- customer.repository`, `npm run typecheck`

- [ ] **Step 7: Commit.** `feat(customers): repository and query/mutation hooks`

---

## Task 4: Customers — CustomerFormModal, CustomerList, CustomersPage

**Files:**
- Create: `src/features/customers/components/CustomerFormModal.tsx` (+ `.test.tsx`)
- Create: `src/features/customers/components/CustomerList.tsx`
- Modify: `src/features/customers/CustomersPage.tsx` (replace placeholder) (+ `.test.tsx`)

**Interfaces:**
- Consumes: `CustomerVM`, `useCustomers`, `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer`, `Field`/`Button`/`Modal`/`Card`/`Toast`.
- Produces: `CustomerFormModal({ customer?: CustomerVM; onClose })`; `CustomerList({ customers; onEdit; onDelete })`; default `CustomersPage`.

- [ ] **Step 1: Write failing `CustomerFormModal` test**

```tsx
// src/features/customers/components/CustomerFormModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/features/customers/mutations/useCustomerMutations', () => ({
  useCreateCustomer: () => ({ mutateAsync: h.create, isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: h.update, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'

describe('CustomerFormModal', () => {
  it('add mode: disabled until name, valid email, and password', async () => {
    render(<CustomerFormModal onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Pat')
    await userEvent.type(screen.getByLabelText(/email/i), 'pat@x.co')
    await userEvent.type(screen.getByLabelText(/temporary password/i), 'secret123')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(h.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Pat', email: 'pat@x.co', tempPassword: 'secret123' }),
    )
  })

  it('edit mode: no password field, email read-only', () => {
    render(
      <CustomerFormModal
        customer={{
          profileId: 'p1',
          fullName: 'Cara',
          email: 'cara@x.co',
          phone: null,
          companyName: null,
          addressLine: null,
          city: null,
          notes: null,
          billCount: 0,
        }}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('readonly')
  })
})
```

- [ ] **Step 2: Run, expect failure.** `npm test -- CustomerFormModal`

- [ ] **Step 3: Implement `CustomerFormModal.tsx`**

```tsx
import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useCreateCustomer, useUpdateCustomer } from '@/features/customers/mutations/useCustomerMutations'
import type { CustomerVM } from '@/features/customers/customers.types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function CustomerFormModal({ customer, onClose }: { customer?: CustomerVM; onClose: () => void }) {
  const isEdit = !!customer
  const [fullName, setFullName] = useState(customer?.fullName ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [tempPassword, setTempPassword] = useState('')
  const [companyName, setCompanyName] = useState(customer?.companyName ?? '')
  const [addressLine, setAddressLine] = useState(customer?.addressLine ?? '')
  const [city, setCity] = useState(customer?.city ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')

  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const { show } = useToast()
  const pending = create.isPending || update.isPending

  const canSave =
    fullName.trim().length > 0 &&
    EMAIL_RE.test(email) &&
    (isEdit || tempPassword.length >= 8)

  const onSave = async () => {
    try {
      if (isEdit) {
        await update.mutateAsync({
          profileId: customer!.profileId,
          input: {
            fullName,
            phone,
            companyName: companyName || null,
            addressLine: addressLine || null,
            city: city || null,
            notes: notes || null,
          },
        })
      } else {
        await create.mutateAsync({
          fullName,
          email,
          phone,
          tempPassword,
          companyName: companyName || null,
          addressLine: addressLine || null,
          city: city || null,
          notes: notes || null,
        })
      }
      show({ type: 'success', title: isEdit ? 'Customer updated' : 'Customer added' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save customer', message: (err as Error).message })
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit customer' : 'Add customer'}>
      <Field id="c-name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Field
        id="c-email"
        label="Email"
        type="email"
        value={email}
        readOnly={isEdit}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field id="c-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {!isEdit && (
        <Field
          id="c-pw"
          label="Temporary password"
          type="password"
          value={tempPassword}
          onChange={(e) => setTempPassword(e.target.value)}
          error={tempPassword.length > 0 && tempPassword.length < 8 ? 'At least 8 characters' : undefined}
        />
      )}
      <Field id="c-company" label="Company (optional)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      <Field id="c-addr" label="Address (optional)" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
      <Field id="c-city" label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
      <Field id="c-notes" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="mt-4 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!canSave || pending} onClick={onSave}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Run, expect pass.** `npm test -- CustomerFormModal`

- [ ] **Step 5: Implement `CustomerList.tsx`**

```tsx
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import type { CustomerVM } from '@/features/customers/customers.types'

export function CustomerList({
  customers,
  onEdit,
  onDelete,
}: {
  customers: CustomerVM[]
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
}) {
  if (customers.length === 0) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">No customers yet — add your first.</p>
  }
  return (
    <div className="space-y-3">
      {customers.map((c) => (
        <Card key={c.profileId} className="flex items-center justify-between p-4">
          <div>
            <h4 className="font-semibold text-[var(--color-neo-text-primary)]">{c.fullName}</h4>
            <p className="text-xs text-[var(--color-neo-text-secondary)]">
              {[c.companyName, c.email, c.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(c)}>
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write failing `CustomersPage` test**

```tsx
// src/features/customers/CustomersPage.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const rows = [
  { profileId: 'p1', fullName: 'Cara Co', email: 'cara@x.co', phone: null, companyName: 'Acme', addressLine: null, city: null, notes: null, billCount: 0 },
  { profileId: 'p2', fullName: 'Bob Bee', email: 'bob@x.co', phone: null, companyName: null, addressLine: null, city: null, notes: null, billCount: 3 },
]
vi.mock('@/features/customers/queries/useCustomers', () => ({
  useCustomers: () => ({ data: rows, isLoading: false, isError: false }),
}))
vi.mock('@/features/customers/mutations/useCustomerMutations', () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCustomer: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import CustomersPage from '@/features/customers/CustomersPage'

describe('CustomersPage', () => {
  it('lists customers and filters by search', async () => {
    render(<CustomersPage />)
    expect(screen.getByText('Cara Co')).toBeInTheDocument()
    expect(screen.getByText('Bob Bee')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'bob')
    expect(screen.queryByText('Cara Co')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Bee')).toBeInTheDocument()
  })

  it('blocks delete for a customer with bills', async () => {
    render(<CustomersPage />)
    const bobRow = screen.getByText('Bob Bee').closest('div')!.parentElement!
    await userEvent.click(within(bobRow).getByRole('button', { name: /delete/i }))
    expect(screen.getByText(/has 3 active bill/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument() // no confirm button
  })
})
```
(Add `import { within } from '@testing-library/react'`.)

- [ ] **Step 7: Run, expect failure.** `npm test -- CustomersPage`

- [ ] **Step 8: Implement `CustomersPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { useToast } from '@/shared/ui/Toast'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useDeleteCustomer } from '@/features/customers/mutations/useCustomerMutations'
import { CustomerList } from '@/features/customers/components/CustomerList'
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'
import type { CustomerVM } from '@/features/customers/customers.types'

export default function CustomersPage() {
  const { data, isLoading, isError } = useCustomers()
  const del = useDeleteCustomer()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CustomerVM | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomerVM | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = data ?? []
    if (!q) return all
    return all.filter((c) =>
      [c.fullName, c.companyName, c.email].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [data, search])

  const runDelete = async () => {
    if (!confirmDelete) return
    try {
      await del.mutateAsync(confirmDelete.profileId)
      show({ type: 'success', title: 'Customer deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete', message: (err as Error).message })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Customers</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">People you bill.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
          Add customer
        </Button>
      </div>

      <Field
        id="customer-search"
        label=""
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load customers.</p>
      ) : (
        <CustomerList customers={filtered} onEdit={setEditing} onDelete={setConfirmDelete} />
      )}

      {editing && (
        <CustomerFormModal
          customer={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete customer?">
        {confirmDelete && confirmDelete.billCount > 0 ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            "{confirmDelete.fullName}" has {confirmDelete.billCount} active bill(s). Delete those first.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-neo-text-secondary)]">
              This disables "{confirmDelete?.fullName}" and hides them from the list.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runDelete}>
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 9: Run tests + typecheck + lint.** `npm test -- customers`, `npm run typecheck`, `npm run lint`

- [ ] **Step 10: Commit.** `feat(customers): CustomerFormModal, CustomerList, CustomersPage`

---

## Task 5: Bills — types, repository, hooks

**Files:**
- Create: `src/features/bills/bills.types.ts`
- Create: `src/features/bills/data/bill.repository.ts` (+ `.test.ts`)
- Create: `src/features/bills/queries/useBills.ts`
- Create: `src/features/bills/mutations/useBillMutations.ts`

**Interfaces:**
- Produces:
  - `BillListItemVM`, `BillDetailVM`, `BillRowVM`, `BillRowDraft` (spec §4).
  - `billRepository.list(): Promise<BillListItemVM[]>`
  - `billRepository.get(id): Promise<BillDetailVM | null>`
  - `billRepository.save(bill: { id?; customerId; orderDate; deadline: string | null; notes: string | null }, rows: BillRowDraft[]): Promise<string>` — `rpc('save_bill', { p_bill, p_rows })`
  - `billRepository.setStatus(id, statusKey): Promise<void>`
  - `billRepository.recordPayment(id, paidAmount): Promise<void>` — `update({ paid_amount })`
  - `billRepository.softDelete(id): Promise<void>` — `rpc('soft_delete_bill')`
  - `useBills()` `['bills']`; `useBill(id)` `['bills', id]`
  - `useSaveBill()` / `useSetBillStatus()` / `useRecordPayment()` / `useDeleteBill()` — invalidate `['bills']` and `['bills', id]`

- [ ] **Step 1: Write `bills.types.ts`** — exactly the four interfaces from spec §4.

- [ ] **Step 2: Write failing repository test**

```ts
// src/features/bills/data/bill.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  listOrder: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'b1',
        bill_number: 'INV-000001',
        customer_id: 'p1',
        order_date: '2026-09-01',
        deadline: null,
        paid_amount: 100,
        profiles: { full_name: 'Cara', email: 'c@x.co', phone: null },
        bill_statuses: { key: 'active', label: 'Active' },
        bill_rows: [
          { id: 'r1', detail: 'A', order_type_id: 'ot1', amount: 300, deleted_at: null, order_types: { name: 'Print' } },
          { id: 'r2', detail: 'B', order_type_id: null, amount: -50, deleted_at: null, order_types: null },
        ],
      },
    ],
    error: null,
  }),
  single: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: 'b1', error: null }),
  eq: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: h.listOrder,
      single: h.single,
      update: vi.fn(() => ({ eq: h.eq })),
    })),
    rpc: h.rpc,
  },
}))

import { billRepository } from '@/features/bills/data/bill.repository'

describe('billRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows and computes total = sum of live rows', async () => {
    const r = await billRepository.list()
    expect(r[0]).toMatchObject({
      id: 'b1',
      billNumber: 'INV-000001',
      customerName: 'Cara',
      statusKey: 'active',
      statusLabel: 'Active',
      total: 250,
      paidAmount: 100,
    })
  })

  it('save calls save_bill with snake_case payload', async () => {
    await billRepository.save(
      { customerId: 'p1', orderDate: '2026-09-01', deadline: null, notes: 'x' },
      [{ detail: 'A', orderTypeId: 'ot1', amount: 300 }, { detail: 'B', orderTypeId: null, amount: -50 }],
    )
    expect(h.rpc).toHaveBeenCalledWith('save_bill', {
      p_bill: { id: undefined, customer_id: 'p1', order_date: '2026-09-01', deadline: null, notes: 'x' },
      p_rows: [
        { id: undefined, detail: 'A', order_type_id: 'ot1', amount: 300 },
        { id: undefined, detail: 'B', order_type_id: null, amount: -50 },
      ],
    })
  })

  it('setStatus and softDelete call their RPCs', async () => {
    await billRepository.setStatus('b1', 'paid')
    expect(h.rpc).toHaveBeenCalledWith('set_bill_status', { p_bill_id: 'b1', p_status_key: 'paid' })
    await billRepository.softDelete('b1')
    expect(h.rpc).toHaveBeenCalledWith('soft_delete_bill', { p_bill_id: 'b1' })
  })
})
```

- [ ] **Step 3: Run, expect failure.** `npm test -- bill.repository`

- [ ] **Step 4: Implement `bill.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type {
  BillListItemVM,
  BillDetailVM,
  BillRowVM,
  BillRowDraft,
} from '@/features/bills/bills.types'

interface RowRow {
  id: string
  detail: string
  order_type_id: string | null
  amount: number
  deleted_at: string | null
  order_types: { name: string } | null
}
interface BillRow {
  id: string
  bill_number: string
  customer_id: string
  order_date: string
  deadline: string | null
  paid_amount: number
  notes?: string | null
  profiles: { full_name: string; email: string; phone: string | null } | null
  bill_statuses: { key: string; label: string } | null
  bill_rows: RowRow[]
}

const SELECT =
  'id, bill_number, customer_id, order_date, deadline, paid_amount, notes, profiles(full_name, email, phone), bill_statuses(key, label), bill_rows(id, detail, order_type_id, amount, deleted_at, order_types(name))'

function liveRows(rows: RowRow[]): BillRowVM[] {
  return rows
    .filter((r) => r.deleted_at === null)
    .map((r) => ({
      id: r.id,
      detail: r.detail,
      orderTypeId: r.order_type_id,
      orderTypeName: r.order_types?.name ?? null,
      amount: Number(r.amount),
    }))
}

function toListItem(b: BillRow): BillListItemVM {
  const rows = liveRows(b.bill_rows)
  return {
    id: b.id,
    billNumber: b.bill_number,
    customerId: b.customer_id,
    customerName: b.profiles?.full_name ?? '',
    statusKey: b.bill_statuses?.key ?? 'pending',
    statusLabel: b.bill_statuses?.label ?? 'Pending',
    total: rows.reduce((s, r) => s + r.amount, 0),
    paidAmount: Number(b.paid_amount),
    orderDate: b.order_date,
    deadline: b.deadline,
  }
}

export const billRepository = {
  async list(): Promise<BillListItemVM[]> {
    const { data, error } = await supabase
      .from('bills')
      .select(SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as BillRow[]).map(toListItem)
  },

  async get(id: string): Promise<BillDetailVM | null> {
    const { data, error } = await supabase.from('bills').select(SELECT).eq('id', id).is('deleted_at', null).single()
    if (error) return null
    const b = data as unknown as BillRow
    return {
      ...toListItem(b),
      customerEmail: b.profiles?.email ?? '',
      customerPhone: b.profiles?.phone ?? null,
      notes: b.notes ?? null,
      rows: liveRows(b.bill_rows),
    }
  },

  async save(
    bill: { id?: string; customerId: string; orderDate: string; deadline: string | null; notes: string | null },
    rows: BillRowDraft[],
  ): Promise<string> {
    const p_bill = {
      id: bill.id,
      customer_id: bill.customerId,
      order_date: bill.orderDate,
      deadline: bill.deadline,
      notes: bill.notes,
    }
    const p_rows = rows.map((r) => ({
      id: r.id,
      detail: r.detail,
      order_type_id: r.orderTypeId,
      amount: r.amount,
    }))
    const { data, error } = await supabase.rpc('save_bill', { p_bill, p_rows })
    if (error) throw error
    return data as string
  },

  async setStatus(id: string, statusKey: string): Promise<void> {
    const { error } = await supabase.rpc('set_bill_status', { p_bill_id: id, p_status_key: statusKey })
    if (error) throw error
  },

  async recordPayment(id: string, paidAmount: number): Promise<void> {
    const { error } = await supabase.from('bills').update({ paid_amount: paidAmount }).eq('id', id)
    if (error) throw error
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_bill', { p_bill_id: id })
    if (error) throw error
  },
}
```

- [ ] **Step 5: Implement the hooks**

```ts
// queries/useBills.ts
import { useQuery } from '@tanstack/react-query'
import { billRepository } from '@/features/bills/data/bill.repository'
export function useBills() {
  return useQuery({ queryKey: ['bills'], queryFn: billRepository.list })
}
export function useBill(id: string) {
  return useQuery({ queryKey: ['bills', id], queryFn: () => billRepository.get(id), enabled: !!id })
}
```

```ts
// mutations/useBillMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billRepository } from '@/features/bills/data/bill.repository'
import type { BillRowDraft } from '@/features/bills/bills.types'

function useInv() {
  const qc = useQueryClient()
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['bills'] })
    if (id) qc.invalidateQueries({ queryKey: ['bills', id] })
  }
}

export function useSaveBill() {
  const inv = useInv()
  return useMutation({
    mutationFn: (v: { bill: Parameters<typeof billRepository.save>[0]; rows: BillRowDraft[] }) =>
      billRepository.save(v.bill, v.rows),
    onSuccess: (id) => inv(id),
  })
}
export function useSetBillStatus() {
  const inv = useInv()
  return useMutation({
    mutationFn: (v: { id: string; statusKey: string }) => billRepository.setStatus(v.id, v.statusKey),
    onSuccess: (_d, v) => inv(v.id),
  })
}
export function useRecordPayment() {
  const inv = useInv()
  return useMutation({
    mutationFn: (v: { id: string; paidAmount: number }) => billRepository.recordPayment(v.id, v.paidAmount),
    onSuccess: (_d, v) => inv(v.id),
  })
}
export function useDeleteBill() {
  const inv = useInv()
  return useMutation({ mutationFn: (id: string) => billRepository.softDelete(id), onSuccess: () => inv() })
}
```

- [ ] **Step 6: Run tests + typecheck.** `npm test -- bill.repository`, `npm run typecheck`

- [ ] **Step 7: Commit.** `feat(bills): repository and query/mutation hooks`

---

## Task 6: Bills — BillRowsEditor + BillFormModal

**Files:**
- Create: `src/features/bills/components/BillRowsEditor.tsx` (+ `.test.tsx`)
- Create: `src/features/bills/components/BillFormModal.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `BillRowDraft`, `useOrderTypes` (Phase 2), `useCustomers` (Task 3), `useSaveBill`, `formatCurrency`, `Field`/`Button`/`Modal`.
- Produces: `BillRowsEditor({ rows, orderTypes, onChange })` where `orderTypes: { id; name; fixedAmount: number | null }[]`; `BillFormModal({ bill?: BillDetailVM; customers; orderTypes; onClose; onSaved? })`.

- [ ] **Step 1: Write failing `BillRowsEditor` test**

```tsx
// src/features/bills/components/BillRowsEditor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillRowsEditor } from '@/features/bills/components/BillRowsEditor'

const orderTypes = [{ id: 'ot1', name: 'Printing', fixedAmount: 250 }]

describe('BillRowsEditor', () => {
  it('adds and removes rows and shows a live total', async () => {
    const onChange = vi.fn()
    const rows = [{ detail: 'A', orderTypeId: null, amount: 100 }]
    const { rerender } = render(<BillRowsEditor rows={rows} orderTypes={orderTypes} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add row/i }))
    expect(onChange).toHaveBeenCalledWith([...rows, { detail: '', orderTypeId: null, amount: 0 }])
    rerender(
      <BillRowsEditor
        rows={[{ detail: 'A', orderTypeId: null, amount: 100 }, { detail: 'B', orderTypeId: null, amount: 50 }]}
        orderTypes={orderTypes}
        onChange={onChange}
      />,
    )
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })

  it('picking an order type fills a zero amount but not a typed one', async () => {
    const onChange = vi.fn()
    render(
      <BillRowsEditor
        rows={[{ detail: 'A', orderTypeId: null, amount: 0 }]}
        orderTypes={orderTypes}
        onChange={onChange}
      />,
    )
    await userEvent.selectOptions(screen.getByLabelText(/row 1 order type/i), 'ot1')
    expect(onChange).toHaveBeenCalledWith([{ detail: 'A', orderTypeId: 'ot1', amount: 250 }])
  })
})
```

- [ ] **Step 2: Run, expect failure.** `npm test -- BillRowsEditor`

- [ ] **Step 3: Implement `BillRowsEditor.tsx`**

```tsx
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { BillRowDraft } from '@/features/bills/bills.types'

interface OrderTypeOption {
  id: string
  name: string
  fixedAmount: number | null
}

export function BillRowsEditor({
  rows,
  orderTypes,
  onChange,
}: {
  rows: BillRowDraft[]
  orderTypes: OrderTypeOption[]
  onChange: (next: BillRowDraft[]) => void
}) {
  const update = (i: number, patch: Partial<BillRowDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const pickType = (i: number, id: string) => {
    const ot = orderTypes.find((o) => o.id === id)
    const row = rows[i]
    const shouldFill = (row.amount === 0 || Number.isNaN(row.amount)) && ot?.fixedAmount != null
    update(i, {
      orderTypeId: id || null,
      amount: shouldFill ? (ot!.fixedAmount as number) : row.amount,
    })
  }

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i))
  const add = () => onChange([...rows, { detail: '', orderTypeId: null, amount: 0 }])

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-neo-text-primary)]">Rows</h3>

      {rows.map((r, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 shadow-[var(--shadow-neo-pressed)]"
        >
          <input
            aria-label={`Row ${i + 1} detail`}
            placeholder="Detail"
            value={r.detail}
            onChange={(e) => update(i, { detail: e.target.value })}
            className="h-9 min-w-[10rem] flex-1 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-neo-primary)]"
          />
          <select
            aria-label={`Row ${i + 1} order type`}
            value={r.orderTypeId ?? ''}
            onChange={(e) => pickType(i, e.target.value)}
            className="h-9 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-sm"
          >
            <option value="">No type</option>
            {orderTypes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            aria-label={`Row ${i + 1} amount`}
            type="number"
            value={Number.isNaN(r.amount) ? '' : r.amount}
            onChange={(e) => update(i, { amount: e.target.value === '' ? 0 : Number(e.target.value) })}
            className="h-9 w-28 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-right text-sm"
          />
          <button
            type="button"
            aria-label={`Delete row ${i + 1}`}
            onClick={() => remove(i)}
            className="rounded p-1.5 text-[var(--color-neo-danger)] hover:bg-[var(--color-neo-card)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={add}>
          Add row
        </Button>
        <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">
          Total: {formatCurrency(total)}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect pass.** `npm test -- BillRowsEditor`

- [ ] **Step 5: Write failing `BillFormModal` test**

```tsx
// src/features/bills/components/BillFormModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue('b1') }))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({ useSaveBill: () => ({ mutateAsync: h.save, isPending: false }) }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { BillFormModal } from '@/features/bills/components/BillFormModal'

const customers = [{ profileId: 'p1', fullName: 'Cara', email: 'c@x.co', phone: null, companyName: null, addressLine: null, city: null, notes: null, billCount: 0 }]
const orderTypes = [{ id: 'ot1', name: 'Printing', fixedAmount: 250 }]

describe('BillFormModal', () => {
  it('save gated on a customer and one detailed row', async () => {
    render(<BillFormModal customers={customers} orderTypes={orderTypes} onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText(/customer/i), 'p1')
    await userEvent.click(screen.getByRole('button', { name: /add row/i }))
    await userEvent.type(screen.getByLabelText(/row 1 detail/i), 'Poster')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(h.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bill: expect.objectContaining({ customerId: 'p1' }),
        rows: [expect.objectContaining({ detail: 'Poster' })],
      }),
    )
  })
})
```

- [ ] **Step 6: Run, expect failure.** `npm test -- BillFormModal`

- [ ] **Step 7: Implement `BillFormModal.tsx`**

```tsx
import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { BillRowsEditor } from '@/features/bills/components/BillRowsEditor'
import { useSaveBill } from '@/features/bills/mutations/useBillMutations'
import type { BillDetailVM, BillRowDraft } from '@/features/bills/bills.types'
import type { CustomerVM } from '@/features/customers/customers.types'

const today = () => new Date().toISOString().slice(0, 10)

export function BillFormModal({
  bill,
  customers,
  orderTypes,
  onClose,
  onSaved,
}: {
  bill?: BillDetailVM
  customers: CustomerVM[]
  orderTypes: { id: string; name: string; fixedAmount: number | null }[]
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const [customerId, setCustomerId] = useState(bill?.customerId ?? '')
  const [orderDate, setOrderDate] = useState(bill?.orderDate ?? today())
  const [deadline, setDeadline] = useState(bill?.deadline ?? '')
  const [notes, setNotes] = useState(bill?.notes ?? '')
  const [rows, setRows] = useState<BillRowDraft[]>(
    bill?.rows.map((r) => ({ id: r.id, detail: r.detail, orderTypeId: r.orderTypeId, amount: r.amount })) ?? [],
  )
  const save = useSaveBill()
  const { show } = useToast()

  const canSave = customerId.length > 0 && rows.some((r) => r.detail.trim().length > 0)

  const onSave = async () => {
    try {
      const id = await save.mutateAsync({
        bill: { id: bill?.id, customerId, orderDate, deadline: deadline || null, notes: notes || null },
        rows: rows.filter((r) => r.detail.trim().length > 0),
      })
      show({ type: 'success', title: bill ? 'Bill updated' : 'Bill created' })
      onSaved?.(id)
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save bill', message: (err as Error).message })
    }
  }

  return (
    <Modal open onClose={onClose} title={bill ? `Edit ${bill.billNumber}` : 'New bill'} className="max-w-2xl">
      <div className="mb-4">
        <label htmlFor="bill-customer" className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]">
          Customer
        </label>
        <select
          id="bill-customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-10 w-full rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] px-3 text-sm shadow-[var(--shadow-neo-pressed)]"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.profileId} value={c.profileId}>
              {c.fullName}
              {c.companyName ? ` · ${c.companyName}` : ''}
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
            No customers yet — add one on the Customers page first.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Field id="bill-order-date" label="Order date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        <Field id="bill-deadline" label="Deadline (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <Field id="bill-notes" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <BillRowsEditor rows={rows} orderTypes={orderTypes} onChange={setRows} />

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!canSave || save.isPending} onClick={onSave}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 8: Run, expect pass; typecheck; lint.** `npm test -- BillFormModal BillRowsEditor`, `npm run typecheck`, `npm run lint`

- [ ] **Step 9: Commit.** `feat(bills): BillRowsEditor and BillFormModal`

---

## Task 7: Bills — BillList + BillsPage

**Files:**
- Create: `src/features/bills/components/BillList.tsx`
- Modify: `src/features/bills/BillsPage.tsx` (replace placeholder) (+ `.test.tsx`)

**Interfaces:**
- Consumes: `useBills`, `useDeleteBill`, `useCustomers`, `useOrderTypes`, `BillFormModal`, `BillList`, `useNavigate`.
- Produces: `BillList({ bills; onOpen; onDelete })`; default `BillsPage`.

- [ ] **Step 1: Implement `BillList.tsx`**

```tsx
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { BillListItemVM } from '@/features/bills/bills.types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--color-neo-secondary)',
  active: 'var(--color-neo-primary)',
  completed: 'var(--color-neo-success)',
  paid: 'var(--color-neo-success)',
}

export function BillList({
  bills,
  onOpen,
  onDelete,
}: {
  bills: BillListItemVM[]
  onOpen: (b: BillListItemVM) => void
  onDelete: (b: BillListItemVM) => void
}) {
  if (bills.length === 0) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">No bills yet.</p>
  }
  return (
    <div className="space-y-3">
      {bills.map((b) => (
        <Card key={b.id} className="flex items-center justify-between p-4">
          <button type="button" onClick={() => onOpen(b)} className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-neo-text-primary)]">{b.billNumber}</span>
              <StatusBadge label={b.statusLabel} color={STATUS_COLOR[b.statusKey]} />
            </div>
            <p className="text-xs text-[var(--color-neo-text-secondary)]">
              {b.customerName} · {formatCurrency(b.total)} · due {b.deadline ?? '—'}
            </p>
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpen(b)}>
              Open
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(b)}>
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write failing `BillsPage` test**

```tsx
// src/features/bills/BillsPage.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const bills = [
  { id: 'b1', billNumber: 'INV-000001', customerId: 'p1', customerName: 'Cara', statusKey: 'pending', statusLabel: 'Pending', total: 300, paidAmount: 0, orderDate: '2026-09-01', deadline: null },
  { id: 'b2', billNumber: 'INV-000002', customerId: 'p2', customerName: 'Bob', statusKey: 'paid', statusLabel: 'Paid', total: 100, paidAmount: 100, orderDate: '2026-09-02', deadline: null },
]
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: () => ({ data: bills, isLoading: false, isError: false }) }))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({ useDeleteBill: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: () => ({ data: [] }) }))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({ useOrderTypes: () => ({ data: [] }) }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import BillsPage from '@/features/bills/BillsPage'

describe('BillsPage', () => {
  it('lists bills and filters by search', async () => {
    render(<MemoryRouter><BillsPage /></MemoryRouter>)
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'INV-000002')
    expect(screen.queryByText('INV-000001')).not.toBeInTheDocument()
    expect(screen.getByText('INV-000002')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run, expect failure.** `npm test -- BillsPage`

- [ ] **Step 4: Implement `BillsPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { useToast } from '@/shared/ui/Toast'
import { useBills } from '@/features/bills/queries/useBills'
import { useDeleteBill } from '@/features/bills/mutations/useBillMutations'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { BillList } from '@/features/bills/components/BillList'
import { BillFormModal } from '@/features/bills/components/BillFormModal'
import type { BillListItemVM } from '@/features/bills/bills.types'

export default function BillsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useBills()
  const { data: customers } = useCustomers()
  const { data: orderTypes } = useOrderTypes()
  const del = useDeleteBill()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<BillListItemVM | null>(null)

  const otOptions = (orderTypes ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({ id: o.id, name: o.name, fixedAmount: o.fixedAmount }))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = data ?? []
    if (!q) return all
    return all.filter((b) => b.billNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q))
  }, [data, search])

  const runDelete = async () => {
    if (!confirmDelete) return
    try {
      await del.mutateAsync(confirmDelete.id)
      show({ type: 'success', title: 'Bill deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete', message: (err as Error).message })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Bills</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">Customer orders and invoices.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          New bill
        </Button>
      </div>

      <Field id="bill-search" label="" placeholder="Search bills…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load bills.</p>
      ) : (
        <BillList
          bills={filtered}
          onOpen={(b) => navigate(`/bills/${b.id}`)}
          onDelete={setConfirmDelete}
        />
      )}

      {creating && (
        <BillFormModal
          customers={customers ?? []}
          orderTypes={otOptions}
          onClose={() => setCreating(false)}
          onSaved={(id) => navigate(`/bills/${id}`)}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete bill?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">This deletes {confirmDelete?.billNumber}.</p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={runDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 5: Run tests + typecheck + lint.** `npm test -- bills`, `npm run typecheck`, `npm run lint`

- [ ] **Step 6: Commit.** `feat(bills): BillList and BillsPage`

---

## Task 8: Bill detail page + status control + payment + route

**Files:**
- Create: `src/features/bills/components/BillStatusControl.tsx` (+ `.test.tsx`)
- Create: `src/features/bills/components/RecordPaymentModal.tsx`
- Create: `src/features/bills/BillDetailPage.tsx`
- Modify: `src/shared/constants/routes.ts`, `src/app/router/AppRouter.tsx`

**Interfaces:**
- Consumes: `useBill`, `useSetBillStatus`, `useRecordPayment`, `useDeleteBill`, `useCustomers`, `useOrderTypes`, `BillFormModal`, `formatCurrency`, `useParams`/`useNavigate`.
- Produces: `BillStatusControl({ currentKey; onChange })`; `RecordPaymentModal({ balance; onSubmit; onClose })`; default `BillDetailPage`; `ROUTES.billDetail = '/bills/:id'`.

- [ ] **Step 1: Add the route**

`routes.ts`: add `billDetail: '/bills/:id',` after `bills`.

`AppRouter.tsx`: add inside the staff `AppLayout` block, after the `/bills` route:
```tsx
import BillDetailPage from '@/features/bills/BillDetailPage'
// ...
<Route path={ROUTES.billDetail} element={<BillDetailPage />} />
```

- [ ] **Step 2: Write failing `BillStatusControl` test**

```tsx
// src/features/bills/components/BillStatusControl.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillStatusControl } from '@/features/bills/components/BillStatusControl'

describe('BillStatusControl', () => {
  it('calls onChange with the clicked status key', async () => {
    const onChange = vi.fn()
    render(<BillStatusControl currentKey="pending" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /active/i }))
    expect(onChange).toHaveBeenCalledWith('active')
  })
})
```

- [ ] **Step 3: Run, expect failure.** `npm test -- BillStatusControl`

- [ ] **Step 4: Implement `BillStatusControl.tsx`**

```tsx
import { cn } from '@/shared/utils/cn'

const STATUSES: { key: string; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'paid', label: 'Paid' },
]

export function BillStatusControl({
  currentKey,
  onChange,
}: {
  currentKey: string
  onChange: (key: string) => void
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-neo-md)] bg-[var(--color-neo-bg)] p-1 shadow-[var(--shadow-neo-pressed)]">
      {STATUSES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          className={cn(
            'rounded-[var(--radius-neo-sm)] px-3 py-1.5 text-sm font-medium transition',
            s.key === currentKey
              ? 'bg-[var(--color-neo-primary)] text-white shadow-[var(--shadow-neo-soft)]'
              : 'text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Implement `RecordPaymentModal.tsx`**

```tsx
import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'

export function RecordPaymentModal({
  balance,
  onSubmit,
  onClose,
}: {
  balance: number
  onSubmit: (amount: number) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState(String(balance))
  return (
    <Modal open onClose={onClose} title="Record payment">
      <Field
        id="pay-amount"
        label="Total paid so far"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <p className="text-xs text-[var(--color-neo-text-secondary)]">
        This sets the running paid total for the bill (it replaces the previous value).
      </p>
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSubmit(Number(amount) || 0)}>
          Save
        </Button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 6: Implement `BillDetailPage.tsx`**

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { useBill } from '@/features/bills/queries/useBills'
import {
  useSetBillStatus,
  useRecordPayment,
  useDeleteBill,
} from '@/features/bills/mutations/useBillMutations'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { BillStatusControl } from '@/features/bills/components/BillStatusControl'
import { RecordPaymentModal } from '@/features/bills/components/RecordPaymentModal'
import { BillFormModal } from '@/features/bills/components/BillFormModal'

export default function BillDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: bill, isLoading } = useBill(id)
  const { data: customers } = useCustomers()
  const { data: orderTypes } = useOrderTypes()
  const setStatus = useSetBillStatus()
  const recordPayment = useRecordPayment()
  const del = useDeleteBill()
  const { show } = useToast()

  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">Loading…</div>
  }
  if (!bill) {
    return <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">Bill not found.</div>
  }

  const balance = bill.total - bill.paidAmount
  const otOptions = (orderTypes ?? []).filter((o) => o.isActive).map((o) => ({ id: o.id, name: o.name, fixedAmount: o.fixedAmount }))

  return (
    <div className="space-y-6 p-6 md:p-8">
      <button
        type="button"
        onClick={() => navigate('/bills')}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-neo-text-secondary)]"
      >
        <ArrowLeft size={16} /> Bills
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">{bill.billNumber}</h1>
          <StatusBadge label={bill.statusLabel} />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      <Card className="space-y-1 p-4 text-sm">
        <p className="font-semibold text-[var(--color-neo-text-primary)]">{bill.customerName}</p>
        <p className="text-[var(--color-neo-text-secondary)]">
          {bill.customerEmail}
          {bill.customerPhone ? ` · ${bill.customerPhone}` : ''}
        </p>
        <p className="text-[var(--color-neo-text-secondary)]">
          Ordered {bill.orderDate} · Due {bill.deadline ?? '—'}
        </p>
        {bill.notes && <p className="text-[var(--color-neo-text-secondary)]">{bill.notes}</p>}
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-neo-text-secondary)]">
                <th className="pb-2">Detail</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-neo-secondary)]/15">
                  <td className="py-2">{r.detail}</td>
                  <td className="py-2 text-[var(--color-neo-text-secondary)]">{r.orderTypeName ?? '—'}</td>
                  <td className="py-2 text-right">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[var(--color-neo-secondary)]/25">
              <tr>
                <td className="pt-2 font-semibold" colSpan={2}>Total</td>
                <td className="pt-2 text-right font-semibold">{formatCurrency(bill.total)}</td>
              </tr>
              <tr>
                <td className="text-[var(--color-neo-text-secondary)]" colSpan={2}>Paid</td>
                <td className="text-right text-[var(--color-neo-text-secondary)]">{formatCurrency(bill.paidAmount)}</td>
              </tr>
              <tr>
                <td className="font-semibold" colSpan={2}>Balance</td>
                <td className={`text-right font-semibold ${balance > 0 ? 'text-[var(--color-neo-danger)]' : ''}`}>
                  {formatCurrency(balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <BillStatusControl
          currentKey={bill.statusKey}
          onChange={async (key) => {
            try {
              await setStatus.mutateAsync({ id: bill.id, statusKey: key })
            } catch (err) {
              show({ type: 'error', title: 'Could not change status', message: (err as Error).message })
            }
          }}
        />
        <Button variant="default" size="sm" onClick={() => setPaying(true)}>
          Record payment
        </Button>
      </div>

      {editing && (
        <BillFormModal
          bill={bill}
          customers={customers ?? []}
          orderTypes={otOptions}
          onClose={() => setEditing(false)}
        />
      )}
      {paying && (
        <RecordPaymentModal
          balance={balance}
          onClose={() => setPaying(false)}
          onSubmit={async (amount) => {
            try {
              await recordPayment.mutateAsync({ id: bill.id, paidAmount: amount })
              show({ type: 'success', title: 'Payment recorded' })
            } catch (err) {
              show({ type: 'error', title: 'Could not record payment', message: (err as Error).message })
            } finally {
              setPaying(false)
            }
          }}
        />
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete bill?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">This deletes {bill.billNumber}.</p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await del.mutateAsync(bill.id)
              show({ type: 'success', title: 'Bill deleted' })
              navigate('/bills')
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 7: Run tests; full verify.**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected: all pass; test count up from 43.

- [ ] **Step 8: Commit.** `feat(bills): bill detail page, status control, payment, /bills/:id route`

---

## Task 9: Manual verification with seeded users

**Files:** none.

- [ ] **Step 1:** `supabase db reset`; `npm run dev`.

- [ ] **Step 2 (admin):** Sign in as `admin@onevo.test`. `/customers` → Add customer (name, email `test1@onevo.test`, phone, company, temp password `password123`). Confirm the toast; the row appears.

- [ ] **Step 3:** Sign out, sign in as `test1@onevo.test` / `password123` → lands on `/portal` (proves the login was created). Sign back in as admin.

- [ ] **Step 4:** `/bills` → New bill → pick the customer, add two rows: row 1 detail "Banners", pick the Phase 2 order type (amount pre-fills), row 2 detail "Rush discount" amount `-200`. Total updates live. Save → redirected to `/bills/:id`.

- [ ] **Step 5:** On detail: Total / Paid (0) / Balance correct. Click **Active** in the status control → badge updates. **Record payment** → enter part of the balance → Balance drops, still red. Edit → change a row amount → Save → detail reflects it.

- [ ] **Step 6:** `/customers` → try to delete the customer → blocked message ("has 1 active bill"). Delete the bill from its detail page, then delete the customer → succeeds.

- [ ] **Step 7 (employee):** Sign in as `staff@onevo.test` → `/bills` and `/customers` both allow full CRUD (no admin gate this phase).

- [ ] **Step 8:** Report any deviation from the spec's Definition of Done (§7).

---

## Self-Review

**1. Spec coverage** — §2.1 customers (Tasks 3–4), §2.2 bills list/form/detail (Tasks 5–8), §3 RPCs (Task 1), §4 architecture/types (Tasks 3, 5), §5 UX (Tasks 4, 6, 7, 8), §6 testing (each task), §7 DoD (Task 9 + threaded `npm test`/`build`). No gap without a task.

**2. Placeholder scan** — no TBD/TODO; every code block is complete.

**3. Type consistency** — `CustomerVM` (Task 3) used unchanged in Tasks 4, 6, 8. `BillListItemVM`/`BillDetailVM`/`BillRowVM`/`BillRowDraft` (Task 5) used consistently in Tasks 6–8; `BillDetailVM extends BillListItemVM` so the detail page reads list fields directly. Repo method names (`list`/`get`/`save`/`setStatus`/`recordPayment`/`softDelete`, `createWithLogin`/`updateDetail`/`softDelete`) match between Task 3/5 impl and Task 4/6/7/8 hooks. RPC names (`save_bill`, `set_bill_status`, `soft_delete_bill`, `soft_delete_customer`) match Task 1 SQL ↔ Task 3/5 repos. `useOrderTypes` returns items with `id`/`name`/`fixedAmount`/`isActive` — matches Phase 2's `OrderTypeVM` (`workflowTemplateId`/`workflowName` also present but unused here).

Fix noted: Task 7's `BillsPage` and Task 8's `BillDetailPage` both derive `otOptions` from `useOrderTypes().data` filtered by `isActive` — the Phase 2 `OrderTypeVM` has `isActive` and `fixedAmount`, so this compiles.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-01-onevo-phase-3-customers-bills.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between.

**2. Inline Execution** — this session, batch with checkpoints.

**Which approach?**
