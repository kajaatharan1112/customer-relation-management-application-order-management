# ONEVO Phase 4 (Tracking + Customer Portal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff move each order row through its workflow stages (with history), give customers a read-only portal that shows their bills progressing, add a per-bill comment thread and file attachments shared by staff and the bill's customer, and make both bill-detail pages update in realtime.

**Architecture:** One migration enables Supabase Realtime on five tables and adds two `security_invoker` views (`bill_history`, `bill_stage_summary`). Four new frontend feature modules (`tracking`, `comments`, `attachments`, `realtime`) follow the established repository → query-hook → mutation-hook → component pattern. Shared components (`StageStepper`, `HistoryTimeline`, `CommentThread`, `AttachmentList`) are used by both the staff `/bills/:id` page and the new customer `/portal/bills/:id` page, gated by `canWrite`/`canManage` props. `useRealtimeBill(billId)` subscribes to `postgres_changes` and invalidates the relevant TanStack Query keys. The stage move itself uses the existing `advance_bill_row_stage` RPC.

**Tech Stack:** Same as Phases 1–3 — React 19, TypeScript, TanStack Query, React Hook Form (where forms appear), Tailwind v4 neo tokens, Supabase (Postgres RPC + RLS + Storage + Realtime).

**Spec:** `docs/superpowers/specs/2026-09-01-onevo-phase-4-tracking-portal-design.md`

## Global Constraints

- Do not modify migrations `0001`–`0006`; add `0007_realtime_and_history_view.sql`.
- All Supabase access (`from` / `rpc` / `storage` / `channel`) lives in `features/*/data/*.repository.ts` or `features/realtime/useRealtimeBill.ts` — never elsewhere.
- View models are camelCase; DB rows stay snake_case until mapped.
- `is_staff()` (admin_member **or** employee) is the write boundary for stage moves + attachment management; the bill's customer may also post comments (RLS already allows this). Portal pages are otherwise read-only.
- Reuse `formatCurrency` (Phase 2). Add `formatBytes` + a relative-time helper in `shared/utils/`.
- Realtime honours RLS — do not add client-side ownership filters expecting to see more; the portal must still guard `portalBill.repository.get` explicitly (returns null unless `customerId === auth uid`).
- **Do NOT run git.** End each task with `ready to commit: <msg>`; the user commits.
- Local SQL tests: `docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < file.sql`. Supabase CLI needs `/c/Users/User/scoop/shims` on PATH. Seeded logins: `admin@onevo.test` / `staff@onevo.test` / `customer@onevo.test`, password `password123`.
- PostgREST embed gotcha (seen in Phase 3): `bills` has two FKs to `profiles` — always disambiguate (`profiles!customer_id(...)`). `bill_comments.author_id` and `order_status_history.changed_by` similarly need `profiles!author_id` / `profiles!changed_by` when embedding.
- Vitest `test.include` is scoped to `src/` — SQL test files are ignored by it.

---

## File Structure

```
supabase/
├── migrations/0007_realtime_and_history_view.sql
└── tests/comments_attachments_rls.test.sql

src/
├── shared/utils/formatBytes.ts (+ .test.ts)
├── shared/utils/relativeTime.ts (+ .test.ts)
├── app/router/AppRouter.tsx                     (already has /portal, /portal/bills/:id — no change)
└── features/
    ├── tracking/
    │   ├── tracking.types.ts
    │   ├── data/tracking.repository.ts (+ .test.ts)
    │   ├── queries/useBillHistory.ts
    │   ├── mutations/useAdvanceStage.ts
    │   └── components/
    │       ├── StageStepper.tsx (+ .test.tsx)
    │       └── HistoryTimeline.tsx
    ├── comments/
    │   ├── comments.types.ts
    │   ├── data/comment.repository.ts (+ .test.ts)
    │   ├── queries/useComments.ts
    │   ├── mutations/useAddComment.ts
    │   └── components/CommentThread.tsx (+ .test.tsx)
    ├── attachments/
    │   ├── attachments.types.ts
    │   ├── data/attachment.repository.ts (+ .test.ts)
    │   ├── queries/useAttachments.ts
    │   ├── mutations/useAttachmentMutations.ts
    │   └── components/AttachmentList.tsx (+ .test.tsx)
    ├── realtime/
    │   └── useRealtimeBill.ts
    ├── bills/BillDetailPage.tsx                  (MODIFY: mount steppers + History + Comments + Attachments + realtime)
    └── portal/
        ├── portal.types.ts
        ├── data/portalBill.repository.ts (+ .test.ts)
        ├── queries/usePortalBills.ts
        ├── PortalHomePage.tsx (+ .test.tsx)      (replace placeholder)
        └── PortalBillPage.tsx (+ .test.tsx)      (replace placeholder)
```

---

## Task 1: Migration 0007 — Realtime + views, regen types, RLS test

**Files:**
- Create: `supabase/migrations/0007_realtime_and_history_view.sql`
- Create: `supabase/tests/comments_attachments_rls.test.sql`
- Modify: `src/core/supabase/database.types.ts`

- [ ] **Step 1: Write the migration**

```sql
-- 0007_realtime_and_history_view.sql

alter publication supabase_realtime add table
  public.bills,
  public.bill_rows,
  public.order_status_history,
  public.bill_comments,
  public.attachments;

create view public.bill_history with (security_invoker = true) as
select
  h.id,
  r.bill_id,
  h.bill_row_id,
  r.detail as row_detail,
  fs.name as from_stage,
  ts.name as to_stage,
  h.note,
  h.created_at,
  p.full_name as changed_by_name
from public.order_status_history h
join public.bill_rows r on r.id = h.bill_row_id
left join public.workflow_stages fs on fs.id = h.from_stage_id
join public.workflow_stages ts on ts.id = h.to_stage_id
left join public.profiles p on p.id = h.changed_by;

create view public.bill_stage_summary with (security_invoker = true) as
select
  b.id as bill_id,
  count(r.id) filter (where r.order_type_id is not null) as tracked_rows,
  count(r.id) filter (where s.is_final) as completed_rows
from public.bills b
left join public.bill_rows r on r.bill_id = b.id and r.deleted_at is null
left join public.workflow_stages s on s.id = r.current_stage_id
group by b.id;

grant select on public.bill_history to authenticated;
grant select on public.bill_stage_summary to authenticated;
```

- [ ] **Step 2: Apply.** `supabase db reset` — expect `0001`–`0007` + seed.

- [ ] **Step 3: Write `supabase/tests/comments_attachments_rls.test.sql`**

```sql
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa01', 'stf4@t.co', '{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-00000000bb01', 'own@t.co',  '{"user_type":"customer"}'),
  ('00000000-0000-0000-0000-00000000cc01', 'other@t.co','{"user_type":"customer"}');

insert into public.bills (id, customer_id)
values ('00000000-0000-0000-0000-0000000bb101', '00000000-0000-0000-0000-00000000bb01');

-- owner customer: can insert a comment on their own bill
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000bb01","role":"authenticated"}';
insert into public.bill_comments (bill_id, author_id, body)
values ('00000000-0000-0000-0000-0000000bb101', '00000000-0000-0000-0000-00000000bb01', 'hello');
select count(*) = 1 as owner_can_comment
from public.bill_comments where bill_id = '00000000-0000-0000-0000-0000000bb101';

-- other customer: cannot insert on someone else's bill
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000cc01","role":"authenticated"}';
do $$
begin
  begin
    insert into public.bill_comments (bill_id, author_id, body)
    values ('00000000-0000-0000-0000-0000000bb101', '00000000-0000-0000-0000-00000000cc01', 'nope');
    raise exception 'FAIL: outsider inserted a comment';
  exception when others then
    raise notice 'OK: outsider comment blocked';
  end;
end $$;

-- other customer: sees zero comments on that bill
select count(*) = 0 as other_sees_no_comments
from public.bill_comments where bill_id = '00000000-0000-0000-0000-0000000bb101';

-- attachments: staff insert; owner reads; outsider does not
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000aa01","role":"authenticated"}';
insert into public.attachments (owner_type, owner_id, storage_path, file_name)
values ('bill', '00000000-0000-0000-0000-0000000bb101', 'bill/00000000-0000-0000-0000-0000000bb101/x.pdf', 'x.pdf');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000bb01","role":"authenticated"}';
select count(*) = 1 as owner_reads_attachment
from public.attachments where owner_id = '00000000-0000-0000-0000-0000000bb101';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000cc01","role":"authenticated"}';
select count(*) = 0 as outsider_no_attachment
from public.attachments where owner_id = '00000000-0000-0000-0000-0000000bb101';

-- bill_history view respects RLS
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000cc01","role":"authenticated"}';
select count(*) = 0 as outsider_no_history
from public.bill_history where bill_id = '00000000-0000-0000-0000-0000000bb101';

reset role;
rollback;
```

- [ ] **Step 4: Run.** `docker exec -i supabase_db_perss_desin psql -U postgres -d postgres < supabase/tests/comments_attachments_rls.test.sql` — expect `owner_can_comment=t`, `other_sees_no_comments=t`, `owner_reads_attachment=t`, `outsider_no_attachment=t`, `outsider_no_history=t`, and two `OK:` notices.

- [ ] **Step 5: Regenerate types.** `supabase gen types typescript --local > src/core/supabase/database.types.ts`; `grep -c "bill_history\|bill_stage_summary" src/core/supabase/database.types.ts` should be ≥ 2. `npm run typecheck` — clean.

- [ ] **Step 6: Commit.** `feat(db): enable realtime, add bill_history + bill_stage_summary views`

---

## Task 2: shared utils — formatBytes + relativeTime

**Files:**
- Create: `src/shared/utils/formatBytes.ts` (+ `.test.ts`), `src/shared/utils/relativeTime.ts` (+ `.test.ts`)

- [ ] **Step 1: Failing tests**

```ts
// formatBytes.test.ts
import { describe, it, expect } from 'vitest'
import { formatBytes } from '@/shared/utils/formatBytes'
describe('formatBytes', () => {
  it('formats', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5_242_880)).toBe('5 MB')
  })
})
```

```ts
// relativeTime.test.ts
import { describe, it, expect } from 'vitest'
import { relativeTime } from '@/shared/utils/relativeTime'
describe('relativeTime', () => {
  it('says just now for <60s', () => {
    expect(relativeTime(new Date().toISOString())).toBe('just now')
  })
  it('says Nm ago', () => {
    const t = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(relativeTime(t)).toBe('5m ago')
  })
})
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

```ts
// formatBytes.ts
export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Number(kb.toFixed(kb < 10 ? 1 : 0))} KB`
  const mb = kb / 1024
  return `${Number(mb.toFixed(mb < 10 ? 1 : 0))} MB`
}
```

```ts
// relativeTime.ts
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
```

- [ ] **Step 4: Run, typecheck, commit.** `chore(shared): add formatBytes and relativeTime`

---

## Task 3: tracking — types, repository, hooks

**Files:**
- Create: `src/features/tracking/tracking.types.ts`
- Create: `src/features/tracking/data/tracking.repository.ts` (+ `.test.ts`)
- Create: `src/features/tracking/queries/useBillHistory.ts`
- Create: `src/features/tracking/mutations/useAdvanceStage.ts`

**Interfaces:**
- Produces:
  - `HistoryEntryVM` (spec §4).
  - `trackingRepository.advanceStage(rowId: string, toStageId: string, note: string | null): Promise<void>` → `rpc('advance_bill_row_stage', { p_row_id, p_to_stage_id, p_note })`
  - `trackingRepository.listHistory(billId: string): Promise<HistoryEntryVM[]>` → `from('bill_history').select('*').eq('bill_id', billId).order('created_at', { ascending: false })`
  - `useBillHistory(billId)` → `['bill-history', billId]`
  - `useAdvanceStage()` → mutation `{ rowId; toStageId; note; billId }`; on success invalidate `['bills', billId]` and `['bill-history', billId]`

- [ ] **Step 1: `tracking.types.ts`**

```ts
export interface HistoryEntryVM {
  id: string
  rowDetail: string
  fromStage: string | null
  toStage: string
  note: string | null
  changedByName: string | null
  createdAt: string
}
```

- [ ] **Step 2: Failing repo test**

```ts
// src/features/tracking/data/tracking.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      { id: 'h1', bill_id: 'b1', bill_row_id: 'r1', row_detail: 'Banners', from_stage: 'Prep', to_stage: 'Typing', note: 'go', created_at: '2026-09-02T10:00:00Z', changed_by_name: 'Ava' },
    ],
    error: null,
  }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: h.order })),
    rpc: h.rpc,
  },
}))
import { trackingRepository } from '@/features/tracking/data/tracking.repository'

describe('trackingRepository', () => {
  beforeEach(() => vi.clearAllMocks())
  it('listHistory maps rows', async () => {
    const r = await trackingRepository.listHistory('b1')
    expect(r).toEqual([
      { id: 'h1', rowDetail: 'Banners', fromStage: 'Prep', toStage: 'Typing', note: 'go', changedByName: 'Ava', createdAt: '2026-09-02T10:00:00Z' },
    ])
  })
  it('advanceStage calls the rpc', async () => {
    await trackingRepository.advanceStage('r1', 's2', 'note')
    expect(h.rpc).toHaveBeenCalledWith('advance_bill_row_stage', { p_row_id: 'r1', p_to_stage_id: 's2', p_note: 'note' })
  })
})
```

- [ ] **Step 3: Run, expect failure.**

- [ ] **Step 4: Implement `tracking.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { HistoryEntryVM } from '@/features/tracking/tracking.types'

interface HistoryRow {
  id: string
  row_detail: string
  from_stage: string | null
  to_stage: string
  note: string | null
  changed_by_name: string | null
  created_at: string
}

export const trackingRepository = {
  async advanceStage(rowId: string, toStageId: string, note: string | null): Promise<void> {
    const { error } = await supabase.rpc('advance_bill_row_stage', {
      p_row_id: rowId,
      p_to_stage_id: toStageId,
      p_note: note,
    })
    if (error) throw error
  },

  async listHistory(billId: string): Promise<HistoryEntryVM[]> {
    const { data, error } = await supabase
      .from('bill_history')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as HistoryRow[]).map((r) => ({
      id: r.id,
      rowDetail: r.row_detail,
      fromStage: r.from_stage,
      toStage: r.to_stage,
      note: r.note,
      changedByName: r.changed_by_name,
      createdAt: r.created_at,
    }))
  },
}
```

- [ ] **Step 5: Implement hooks**

```ts
// queries/useBillHistory.ts
import { useQuery } from '@tanstack/react-query'
import { trackingRepository } from '@/features/tracking/data/tracking.repository'
export function useBillHistory(billId: string) {
  return useQuery({
    queryKey: ['bill-history', billId],
    queryFn: () => trackingRepository.listHistory(billId),
    enabled: !!billId,
  })
}
```

```ts
// mutations/useAdvanceStage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trackingRepository } from '@/features/tracking/data/tracking.repository'

export function useAdvanceStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { rowId: string; toStageId: string; note: string | null; billId: string }) =>
      trackingRepository.advanceStage(v.rowId, v.toStageId, v.note),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['bills', v.billId] })
      qc.invalidateQueries({ queryKey: ['bill-history', v.billId] })
    },
  })
}
```

- [ ] **Step 6: Run tests + typecheck; commit.** `feat(tracking): repository and hooks`

---

## Task 4: tracking — StageStepper + HistoryTimeline

**Files:**
- Create: `src/features/tracking/components/StageStepper.tsx` (+ `.test.tsx`)
- Create: `src/features/tracking/components/HistoryTimeline.tsx`

**Interfaces:**
- Consumes: `WorkflowStageVM` (from `@/features/settings/settings.types`), `HistoryEntryVM`, `relativeTime`.
- Produces:
  - `StageStepper({ stages, currentStageId, onPick })` — `stages: WorkflowStageVM[]` (already sorted), `currentStageId: string | null`, `onPick?: (stageId: string) => void`. When `onPick` is omitted the stepper is read-only (no buttons).
  - `HistoryTimeline({ entries }: { entries: HistoryEntryVM[] })`.

- [ ] **Step 1: Failing `StageStepper` test**

```tsx
// src/features/tracking/components/StageStepper.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StageStepper } from '@/features/tracking/components/StageStepper'

const stages = [
  { id: 's1', name: 'Prep', sortOrder: 1, color: '#111', isFinal: false },
  { id: 's2', name: 'Print', sortOrder: 2, color: '#222', isFinal: false },
  { id: 's3', name: 'Done', sortOrder: 3, color: '#333', isFinal: true },
]

describe('StageStepper', () => {
  it('renders stages and marks the current one', () => {
    render(<StageStepper stages={stages} currentStageId="s2" />)
    expect(screen.getByText('Prep')).toBeInTheDocument()
    expect(screen.getByText('Print').closest('[data-current]')).not.toBeNull()
  })
  it('interactive: clicking a stage calls onPick', async () => {
    const onPick = vi.fn()
    render(<StageStepper stages={stages} currentStageId="s1" onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /print/i }))
    expect(onPick).toHaveBeenCalledWith('s2')
  })
  it('read-only: no buttons when onPick omitted', () => {
    render(<StageStepper stages={stages} currentStageId="s1" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `StageStepper.tsx`**

```tsx
import type { WorkflowStageVM } from '@/features/settings/settings.types'
import { cn } from '@/shared/utils/cn'

export function StageStepper({
  stages,
  currentStageId,
  onPick,
}: {
  stages: WorkflowStageVM[]
  currentStageId: string | null
  onPick?: (stageId: string) => void
}) {
  const currentIdx = stages.findIndex((s) => s.id === currentStageId)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {stages.map((s, i) => {
        const isCurrent = s.id === currentStageId
        const isDone = currentIdx >= 0 && i < currentIdx
        const content = (
          <span
            {...(isCurrent ? { 'data-current': true } : {})}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition',
              isCurrent
                ? 'text-white'
                : isDone
                  ? 'text-[var(--color-neo-text-primary)]'
                  : 'text-[var(--color-neo-text-secondary)]',
            )}
            style={isCurrent ? { background: s.color } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: isCurrent || isDone ? s.color : 'var(--color-neo-secondary)' }}
            />
            {s.name}
          </span>
        )
        return onPick ? (
          <button key={s.id} type="button" onClick={() => onPick(s.id)} className="rounded-full hover:bg-[var(--color-neo-bg)]">
            {content}
          </button>
        ) : (
          <span key={s.id}>{content}</span>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Implement `HistoryTimeline.tsx`**

```tsx
import { relativeTime } from '@/shared/utils/relativeTime'
import type { HistoryEntryVM } from '@/features/tracking/tracking.types'

export function HistoryTimeline({ entries }: { entries: HistoryEntryVM[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">No stage changes yet.</p>
  }
  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-neo-primary)]" />
          <div>
            <p className="text-[var(--color-neo-text-primary)]">
              <span className="font-medium">{e.rowDetail}</span>{' '}
              {e.fromStage ? `${e.fromStage} → ` : ''}
              <span className="font-medium">{e.toStage}</span>
            </p>
            <p className="text-xs text-[var(--color-neo-text-secondary)]">
              {e.changedByName ?? 'System'} · {relativeTime(e.createdAt)}
              {e.note ? ` · ${e.note}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: Typecheck, lint, commit.** `feat(tracking): StageStepper and HistoryTimeline`

---

## Task 5: comments — types, repository, hooks, CommentThread

**Files:**
- Create: `src/features/comments/comments.types.ts`
- Create: `src/features/comments/data/comment.repository.ts` (+ `.test.ts`)
- Create: `src/features/comments/queries/useComments.ts`
- Create: `src/features/comments/mutations/useAddComment.ts`
- Create: `src/features/comments/components/CommentThread.tsx` (+ `.test.tsx`)

**Interfaces:**
- Produces:
  - `CommentVM` (spec §4).
  - `commentRepository.list(billId): Promise<CommentVM[]>` — `from('bill_comments').select('id, body, created_at, author_id, profiles!author_id(full_name, user_types(key))').eq('bill_id', billId).is('deleted_at', null).order('created_at')`
  - `commentRepository.add(billId, body): Promise<void>` — `insert({ bill_id: billId, author_id: (await supabase.auth.getUser()).data.user!.id, body })`
  - `useComments(billId)` → `['bill-comments', billId]`
  - `useAddComment(billId)` → invalidates `['bill-comments', billId]`
  - `CommentThread({ comments, onPost, posting })` — list + composer; `onPost(body: string)`; Send disabled when empty/posting.

- [ ] **Step 1: `comments.types.ts`**

```ts
export interface CommentVM {
  id: string
  authorName: string
  authorIsStaff: boolean
  body: string
  createdAt: string
}
```

- [ ] **Step 2: Failing repo test**

```ts
// src/features/comments/data/comment.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      { id: 'c1', body: 'hi', created_at: '2026-09-02T10:00:00Z', author_id: 'u1', profiles: { full_name: 'Ava', user_types: { key: 'admin_member' } } },
      { id: 'c2', body: 'thanks', created_at: '2026-09-02T11:00:00Z', author_id: 'u2', profiles: { full_name: 'Cara', user_types: { key: 'customer' } } },
    ],
    error: null,
  }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      insert: h.insert,
    })),
    auth: { getUser: h.getUser },
  },
}))
import { commentRepository } from '@/features/comments/data/comment.repository'

describe('commentRepository', () => {
  beforeEach(() => vi.clearAllMocks())
  it('list maps rows and staff flag', async () => {
    const r = await commentRepository.list('b1')
    expect(r).toEqual([
      { id: 'c1', authorName: 'Ava', authorIsStaff: true, body: 'hi', createdAt: '2026-09-02T10:00:00Z' },
      { id: 'c2', authorName: 'Cara', authorIsStaff: false, body: 'thanks', createdAt: '2026-09-02T11:00:00Z' },
    ])
  })
  it('add inserts with the current user as author', async () => {
    await commentRepository.add('b1', 'new comment')
    expect(h.insert).toHaveBeenCalledWith({ bill_id: 'b1', author_id: 'u1', body: 'new comment' })
  })
})
```

- [ ] **Step 3: Run, expect failure.**

- [ ] **Step 4: Implement `comment.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { CommentVM } from '@/features/comments/comments.types'

interface CommentRow {
  id: string
  body: string
  created_at: string
  author_id: string
  profiles: { full_name: string; user_types: { key: string } | null } | null
}

const STAFF_KEYS = ['admin_member', 'employee']

export const commentRepository = {
  async list(billId: string): Promise<CommentVM[]> {
    const { data, error } = await supabase
      .from('bill_comments')
      .select('id, body, created_at, author_id, profiles!author_id(full_name, user_types(key))')
      .eq('bill_id', billId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data as unknown as CommentRow[]).map((r) => ({
      id: r.id,
      authorName: r.profiles?.full_name ?? 'Unknown',
      authorIsStaff: STAFF_KEYS.includes(r.profiles?.user_types?.key ?? ''),
      body: r.body,
      createdAt: r.created_at,
    }))
  },

  async add(billId: string, body: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    const authorId = userData.user?.id
    if (!authorId) throw new Error('not signed in')
    const { error } = await supabase
      .from('bill_comments')
      .insert({ bill_id: billId, author_id: authorId, body })
    if (error) throw error
  },
}
```

- [ ] **Step 5: Hooks**

```ts
// queries/useComments.ts
import { useQuery } from '@tanstack/react-query'
import { commentRepository } from '@/features/comments/data/comment.repository'
export function useComments(billId: string) {
  return useQuery({
    queryKey: ['bill-comments', billId],
    queryFn: () => commentRepository.list(billId),
    enabled: !!billId,
  })
}
```

```ts
// mutations/useAddComment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentRepository } from '@/features/comments/data/comment.repository'
export function useAddComment(billId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => commentRepository.add(billId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-comments', billId] }),
  })
}
```

- [ ] **Step 6: Failing `CommentThread` test**

```tsx
// src/features/comments/components/CommentThread.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentThread } from '@/features/comments/components/CommentThread'

const comments = [
  { id: 'c1', authorName: 'Ava', authorIsStaff: true, body: 'hi', createdAt: new Date().toISOString() },
]

describe('CommentThread', () => {
  it('lists comments and posts a new one', async () => {
    const onPost = vi.fn().mockResolvedValue(undefined)
    render(<CommentThread comments={comments} onPost={onPost} posting={false} />)
    expect(screen.getByText('hi')).toBeInTheDocument()
    const box = screen.getByPlaceholderText(/write a message/i)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    await userEvent.type(box, 'my reply')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onPost).toHaveBeenCalledWith('my reply')
  })
})
```

- [ ] **Step 7: Run, expect failure.**

- [ ] **Step 8: Implement `CommentThread.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { relativeTime } from '@/shared/utils/relativeTime'
import type { CommentVM } from '@/features/comments/comments.types'

export function CommentThread({
  comments,
  onPost,
  posting,
}: {
  comments: CommentVM[]
  onPost: (body: string) => Promise<void> | void
  posting: boolean
}) {
  const [draft, setDraft] = useState('')

  const submit = async () => {
    const body = draft.trim()
    if (!body) return
    await onPost(body)
    setDraft('')
  }

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">No messages yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-3 shadow-[var(--shadow-neo-pressed)]">
              <p className="text-xs font-semibold text-[var(--color-neo-text-primary)]">
                {c.authorName}
                {c.authorIsStaff && (
                  <span className="ml-1 rounded bg-[var(--color-neo-primary)]/15 px-1 text-[10px] text-[var(--color-neo-primary)]">
                    Staff
                  </span>
                )}
                <span className="ml-2 font-normal text-[var(--color-neo-text-secondary)]">
                  {relativeTime(c.createdAt)}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-neo-text-primary)]">{c.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="flex-1 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 text-sm shadow-[var(--shadow-neo-pressed)] outline-none focus:ring-2 focus:ring-[var(--color-neo-primary)]"
        />
        <Button type="button" variant="primary" disabled={!draft.trim() || posting} onClick={submit}>
          {posting ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Run, typecheck, lint, commit.** `feat(comments): repository, hooks, CommentThread`

---

## Task 6: attachments — types, repository, hooks, AttachmentList

**Files:**
- Create: `src/features/attachments/attachments.types.ts`
- Create: `src/features/attachments/data/attachment.repository.ts` (+ `.test.ts`)
- Create: `src/features/attachments/queries/useAttachments.ts`
- Create: `src/features/attachments/mutations/useAttachmentMutations.ts`
- Create: `src/features/attachments/components/AttachmentList.tsx` (+ `.test.tsx`)

**Interfaces:**
- Produces:
  - `AttachmentVM` (spec §4).
  - `attachmentRepository.list(billId): Promise<AttachmentVM[]>` — `from('attachments').select('id, file_name, size_bytes, storage_path, created_at, profiles!uploaded_by(full_name)').eq('owner_type', 'bill').eq('owner_id', billId).is('deleted_at', null).order('created_at', { ascending: false })`
  - `attachmentRepository.upload(billId: string, file: File): Promise<void>` — `storage.from('attachments').upload(path, file)` then `from('attachments').insert({ owner_type:'bill', owner_id: billId, storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: <uid> })`. `path = ` bill/${billId}/${crypto.randomUUID()}-${safeName}`
  - `attachmentRepository.signedUrl(path: string): Promise<string>` — `storage.from('attachments').createSignedUrl(path, 60)` → `data.signedUrl`
  - `attachmentRepository.remove(id: string, path: string): Promise<void>` — `storage.from('attachments').remove([path])` then `from('attachments').update({ deleted_at: new Date().toISOString() }).eq('id', id)`
  - `useAttachments(billId)` → `['bill-attachments', billId]`
  - `useUploadAttachment(billId)` / `useRemoveAttachment(billId)` — invalidate `['bill-attachments', billId]`
  - `AttachmentList({ attachments, canManage, onUpload, onRemove, onDownload })`

- [ ] **Step 1: `attachments.types.ts`**

```ts
export interface AttachmentVM {
  id: string
  fileName: string
  sizeBytes: number | null
  storagePath: string
  uploadedByName: string | null
  createdAt: string
}
```

- [ ] **Step 2: Failing repo test**

```ts
// src/features/attachments/data/attachment.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      { id: 'a1', file_name: 'proof.pdf', size_bytes: 2048, storage_path: 'bill/b1/uuid-proof.pdf', created_at: '2026-09-02T10:00:00Z', profiles: { full_name: 'Ava' } },
    ],
    error: null,
  }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  updateEq: vi.fn().mockResolvedValue({ error: null }),
  stUpload: vi.fn().mockResolvedValue({ error: null }),
  stSigned: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://x/y' }, error: null }),
  stRemove: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      insert: h.insert,
      update: vi.fn(() => ({ eq: h.updateEq })),
    })),
    storage: { from: vi.fn(() => ({ upload: h.stUpload, createSignedUrl: h.stSigned, remove: h.stRemove })) },
    auth: { getUser: h.getUser },
  },
}))
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'

describe('attachmentRepository', () => {
  beforeEach(() => vi.clearAllMocks())
  it('list maps rows', async () => {
    const r = await attachmentRepository.list('b1')
    expect(r).toEqual([
      { id: 'a1', fileName: 'proof.pdf', sizeBytes: 2048, storagePath: 'bill/b1/uuid-proof.pdf', uploadedByName: 'Ava', createdAt: '2026-09-02T10:00:00Z' },
    ])
  })
  it('signedUrl returns the url', async () => {
    expect(await attachmentRepository.signedUrl('bill/b1/x.pdf')).toBe('https://x/y')
    expect(h.stSigned).toHaveBeenCalledWith('bill/b1/x.pdf', 60)
  })
  it('remove deletes the object then soft-deletes the row', async () => {
    await attachmentRepository.remove('a1', 'bill/b1/x.pdf')
    expect(h.stRemove).toHaveBeenCalledWith(['bill/b1/x.pdf'])
    expect(h.updateEq).toHaveBeenCalledWith('id', 'a1')
  })
})
```

- [ ] **Step 3: Run, expect failure.**

- [ ] **Step 4: Implement `attachment.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import type { AttachmentVM } from '@/features/attachments/attachments.types'

interface AttachmentRow {
  id: string
  file_name: string
  size_bytes: number | null
  storage_path: string
  created_at: string
  profiles: { full_name: string } | null
}

const BUCKET = 'attachments'

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
}

export const attachmentRepository = {
  async list(billId: string): Promise<AttachmentVM[]> {
    const { data, error } = await supabase
      .from('attachments')
      .select('id, file_name, size_bytes, storage_path, created_at, profiles!uploaded_by(full_name)')
      .eq('owner_type', 'bill')
      .eq('owner_id', billId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as AttachmentRow[]).map((r) => ({
      id: r.id,
      fileName: r.file_name,
      sizeBytes: r.size_bytes,
      storagePath: r.storage_path,
      uploadedByName: r.profiles?.full_name ?? null,
      createdAt: r.created_at,
    }))
  },

  async upload(billId: string, file: File): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) throw new Error('not signed in')
    const path = `bill/${billId}/${crypto.randomUUID()}-${safeName(file.name)}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (upErr) throw upErr
    const { error: insErr } = await supabase.from('attachments').insert({
      owner_type: 'bill',
      owner_id: billId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: uid,
    })
    if (insErr) throw insErr
  },

  async signedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
    if (error || !data) throw error ?? new Error('could not sign url')
    return data.signedUrl
  },

  async remove(id: string, path: string): Promise<void> {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path])
    if (rmErr) throw rmErr
    const { error: updErr } = await supabase
      .from('attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (updErr) throw updErr
  },
}
```

- [ ] **Step 5: Hooks**

```ts
// queries/useAttachments.ts
import { useQuery } from '@tanstack/react-query'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'
export function useAttachments(billId: string) {
  return useQuery({
    queryKey: ['bill-attachments', billId],
    queryFn: () => attachmentRepository.list(billId),
    enabled: !!billId,
  })
}
```

```ts
// mutations/useAttachmentMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'

export function useUploadAttachment(billId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => attachmentRepository.upload(billId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-attachments', billId] }),
  })
}
export function useRemoveAttachment(billId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; path: string }) => attachmentRepository.remove(v.id, v.path),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-attachments', billId] }),
  })
}
```

- [ ] **Step 6: Failing `AttachmentList` test**

```tsx
// src/features/attachments/components/AttachmentList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'

const atts = [
  { id: 'a1', fileName: 'proof.pdf', sizeBytes: 2048, storagePath: 'bill/b1/x.pdf', uploadedByName: 'Ava', createdAt: new Date().toISOString() },
]

describe('AttachmentList', () => {
  it('read-only: download only, no upload/remove', () => {
    render(
      <AttachmentList attachments={atts} canManage={false} onUpload={vi.fn()} onRemove={vi.fn()} onDownload={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/upload a file/i)).not.toBeInTheDocument()
  })
  it('manage: shows upload + remove, download calls onDownload', async () => {
    const onDownload = vi.fn()
    render(
      <AttachmentList attachments={atts} canManage onUpload={vi.fn()} onRemove={vi.fn()} onDownload={onDownload} />,
    )
    expect(screen.getByLabelText(/upload a file/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(onDownload).toHaveBeenCalledWith(atts[0])
  })
})
```

- [ ] **Step 7: Run, expect failure.**

- [ ] **Step 8: Implement `AttachmentList.tsx`**

```tsx
import { useRef } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { formatBytes } from '@/shared/utils/formatBytes'
import type { AttachmentVM } from '@/features/attachments/attachments.types'

const MAX_BYTES = 10 * 1024 * 1024

export function AttachmentList({
  attachments,
  canManage,
  onUpload,
  onRemove,
  onDownload,
}: {
  attachments: AttachmentVM[]
  canManage: boolean
  onUpload: (file: File) => void
  onRemove: (a: AttachmentVM) => void
  onDownload: (a: AttachmentVM) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            aria-label="Upload a file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (f.size > MAX_BYTES) {
                alert('File is larger than 10 MB.')
                return
              }
              onUpload(f)
            }}
          />
          <Button type="button" variant="ghost" icon={<Upload size={16} />} onClick={() => inputRef.current?.click()}>
            Upload file
          </Button>
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">No files.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 text-sm shadow-[var(--shadow-neo-pressed)]"
            >
              <span>
                {a.fileName}{' '}
                <span className="text-xs text-[var(--color-neo-text-secondary)]">
                  ({formatBytes(a.sizeBytes)})
                </span>
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  aria-label="Download"
                  onClick={() => onDownload(a)}
                  className="rounded p-1.5 hover:bg-[var(--color-neo-card)]"
                >
                  <Download size={16} />
                </button>
                {canManage && (
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => onRemove(a)}
                    className="rounded p-1.5 text-[var(--color-neo-danger)] hover:bg-[var(--color-neo-card)]"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Run, typecheck, lint, commit.** `feat(attachments): repository, hooks, AttachmentList`

---

## Task 7: realtime — useRealtimeBill

**Files:**
- Create: `src/features/realtime/useRealtimeBill.ts`

**Interfaces:**
- Produces: `useRealtimeBill(billId: string): void` — on mount subscribes to a Supabase channel for `postgres_changes` on `bills` (filter `id=eq.<billId>`), `bill_rows`/`order_status_history` (no server filter — filtered client-side is unnecessary; just invalidate), `bill_comments`/`attachments` (filter `owner_id`/`bill_id` where possible). On any event, invalidates `['bills', billId]`, `['bill-history', billId]`, `['bill-comments', billId]`, `['bill-attachments', billId]`, `['bills']`, `['portal-bills']`. Cleans up the channel on unmount / billId change.

- [ ] **Step 1: Implement**

```ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'

export function useRealtimeBill(billId: string): void {
  const qc = useQueryClient()

  useEffect(() => {
    if (!billId) return

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['bills', billId] })
      qc.invalidateQueries({ queryKey: ['bill-history', billId] })
      qc.invalidateQueries({ queryKey: ['bill-comments', billId] })
      qc.invalidateQueries({ queryKey: ['bill-attachments', billId] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['portal-bills'] })
    }

    const channel = supabase
      .channel(`bill-${billId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `id=eq.${billId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_rows', filter: `bill_id=eq.${billId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_comments', filter: `bill_id=eq.${billId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments', filter: `owner_id=eq.${billId}` }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [billId, qc])
}
```

- [ ] **Step 2: Typecheck.** (No unit test — effect-only Supabase channel wiring; covered by the manual realtime check in Task 10.)

- [ ] **Step 3: Commit.** `feat(realtime): add useRealtimeBill subscription hook`

---

## Task 8: Staff BillDetailPage — mount steppers, history, comments, attachments, realtime

**Files:**
- Modify: `src/features/bills/BillDetailPage.tsx`
- Modify: `src/features/bills/BillDetailPage.test.tsx` (create if absent — a light render test with mocked hooks)

**Interfaces:**
- Consumes: `useWorkflowTemplates` (Phase 2), `useBillHistory` + `useAdvanceStage` + `StageStepper` + `HistoryTimeline` (Tasks 3–4), `useComments` + `useAddComment` + `CommentThread` (Task 5), `useAttachments` + `useUploadAttachment` + `useRemoveAttachment` + `AttachmentList` + `attachmentRepository.signedUrl` (Task 6), `useRealtimeBill` (Task 7), `useRole`.

- [ ] **Step 1: Add to `BillDetailPage.tsx`** (keep everything from Phase 3; add below)

Near the top of the component:
```tsx
import { useWorkflowTemplates } from '@/features/settings/queries/useWorkflowTemplates'
import { useBillHistory } from '@/features/tracking/queries/useBillHistory'
import { useAdvanceStage } from '@/features/tracking/mutations/useAdvanceStage'
import { StageStepper } from '@/features/tracking/components/StageStepper'
import { HistoryTimeline } from '@/features/tracking/components/HistoryTimeline'
import { useComments } from '@/features/comments/queries/useComments'
import { useAddComment } from '@/features/comments/mutations/useAddComment'
import { CommentThread } from '@/features/comments/components/CommentThread'
import { useAttachments } from '@/features/attachments/queries/useAttachments'
import { useUploadAttachment, useRemoveAttachment } from '@/features/attachments/mutations/useAttachmentMutations'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'
import { useRealtimeBill } from '@/features/realtime/useRealtimeBill'
import { useRole } from '@/core/auth/auth.hooks'
```

Inside the component (after `const { data: bill } = useBill(id)`), and gated so hooks always run — call them with `id` (they're `enabled: !!id`):
```tsx
useRealtimeBill(id)
const { isStaff } = useRole()
const { data: templates } = useWorkflowTemplates()
const history = useBillHistory(id)
const advance = useAdvanceStage()
const comments = useComments(id)
const addComment = useAddComment(id)
const attachments = useAttachments(id)
const upload = useUploadAttachment(id)
const removeAtt = useRemoveAttachment(id)

const stagesFor = (orderTypeId: string | null) => {
  if (!orderTypeId || !templates) return []
  // find the template whose id matches the order type's workflow — but OrderTypeVM
  // isn't loaded here; instead match by checking each template's stages contains the row's current stage.
  // Simpler: load order types too. Add: const { data: orderTypes } = useOrderTypes()  (already imported in Phase 3 page)
  const ot = (orderTypes ?? []).find((o) => o.id === orderTypeId)
  const tpl = templates.find((t) => t.id === ot?.workflowTemplateId)
  return tpl?.stages ?? []
}
```
(Phase 3's `BillDetailPage` already calls `useOrderTypes()` as `orderTypes` for `otOptions` — reuse it. `OrderTypeVM` has `workflowTemplateId`.)

In the rows `<tbody>`, after each row's cells, add a full-width sub-row when the row has an order type:
```tsx
{bill.rows.map((r) => (
  <Fragment key={r.id}>
    <tr className="border-t border-[var(--color-neo-secondary)]/15">
      <td className="py-2">{r.detail}</td>
      <td className="py-2 text-[var(--color-neo-text-secondary)]">{r.orderTypeName ?? '—'}</td>
      <td className="py-2 text-right">{formatCurrency(r.amount)}</td>
    </tr>
    {r.orderTypeId && (
      <tr>
        <td colSpan={3} className="pb-3">
          <StageStepper
            stages={stagesFor(r.orderTypeId)}
            currentStageId={r.currentStageId ?? null}
            onPick={
              isStaff
                ? (stageId) => {
                    const note = window.prompt('Note for this stage change (optional):') ?? null
                    advance.mutate({ rowId: r.id, toStageId: stageId, note, billId: bill.id })
                  }
                : undefined
            }
          />
        </td>
      </tr>
    )}
  </Fragment>
))}
```
**Note:** `BillRowVM` (Phase 3) does not currently expose `currentStageId`. Add it: in `bills.types.ts` add `currentStageId: string | null` to `BillRowVM`, and in `bill.repository.ts` `SELECT` add `current_stage_id` to the `bill_rows(...)` embed and map it in `liveRows`. Update the Phase 3 `bill.repository.test.ts` fixture rows to include `current_stage_id: null`. Import `Fragment` from `react`.

Below the rows `Card`, add three `Card`s:
```tsx
<Card className="p-4">
  <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">History</h2>
  <HistoryTimeline entries={history.data ?? []} />
</Card>

<Card className="p-4">
  <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Messages</h2>
  <CommentThread
    comments={comments.data ?? []}
    posting={addComment.isPending}
    onPost={async (body) => {
      try {
        await addComment.mutateAsync(body)
      } catch (err) {
        show({ type: 'error', title: 'Could not send', message: (err as Error).message })
      }
    }}
  />
</Card>

<Card className="p-4">
  <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Files</h2>
  <AttachmentList
    attachments={attachments.data ?? []}
    canManage={isStaff}
    onUpload={(file) => upload.mutate(file)}
    onRemove={(a) => removeAtt.mutate({ id: a.id, path: a.storagePath })}
    onDownload={async (a) => {
      try {
        const url = await attachmentRepository.signedUrl(a.storagePath)
        window.open(url, '_blank', 'noopener')
      } catch (err) {
        show({ type: 'error', title: 'Could not open file', message: (err as Error).message })
      }
    }}
  />
</Card>
```

- [ ] **Step 2: Light render test** (`BillDetailPage.test.tsx`) — mock `useBill` to return a bill with one tagged row, mock all the Phase 4 hooks to return empty data + non-pending mutations, mock `useAuth`/`useRole` as staff, `useParams` id. Assert the page renders "History", "Messages", "Files" headings and the row detail. (Mirror the mocking style of `SettingsPage.test.tsx`.)

- [ ] **Step 3: Run tests, typecheck, lint.** `npm test -- BillDetailPage bill.repository`, `npm run typecheck`, `npm run lint`

- [ ] **Step 4: Commit.** `feat(bills): stage steppers, history, messages, files on the bill detail page`

---

## Task 9: Customer portal — repository, list, home page

**Files:**
- Create: `src/features/portal/portal.types.ts`
- Create: `src/features/portal/data/portalBill.repository.ts` (+ `.test.ts`)
- Create: `src/features/portal/queries/usePortalBills.ts`
- Modify: `src/features/portal/PortalHomePage.tsx` (replace placeholder) (+ `.test.tsx`)

**Interfaces:**
- Produces:
  - `PortalBillListVM = { id; billNumber; statusKey; statusLabel; total; deadline; trackedRows: number; completedRows: number }`
  - `portalBillRepository.list(): Promise<PortalBillListVM[]>` — `from('bills').select('id, bill_number, deadline, bill_statuses(key,label), bill_rows(amount, deleted_at), bill_stage_summary(tracked_rows, completed_rows)').is('deleted_at', null).order('created_at', {ascending:false})` (RLS already limits to the signed-in customer's bills). Total = sum of live rows.
  - `portalBillRepository.get(id): Promise<BillDetailVM | null>` — reuse `billRepository.get(id)` then return `null` unless `bill.customerId === (await supabase.auth.getUser()).data.user?.id`.
  - `usePortalBills()` → `['portal-bills']`
  - `usePortalBill(id)` → `['portal-bill', id]`

- [ ] **Step 1: `portal.types.ts`**

```ts
export interface PortalBillListVM {
  id: string
  billNumber: string
  statusKey: string
  statusLabel: string
  total: number
  deadline: string | null
  trackedRows: number
  completedRows: number
}
```

- [ ] **Step 2: Failing repo test**

```ts
// src/features/portal/data/portalBill.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'b1',
        bill_number: 'INV-000001',
        deadline: null,
        bill_statuses: { key: 'active', label: 'Active' },
        bill_rows: [
          { amount: 300, deleted_at: null },
          { amount: -50, deleted_at: null },
        ],
        bill_stage_summary: { tracked_rows: 2, completed_rows: 1 },
      },
    ],
    error: null,
  }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: h.order })),
    auth: { getUser: h.getUser },
  },
}))
vi.mock('@/features/bills/data/bill.repository', () => ({
  billRepository: { get: vi.fn().mockResolvedValue({ id: 'b1', customerId: 'me' }) },
}))
import { portalBillRepository } from '@/features/portal/data/portalBill.repository'
import { billRepository } from '@/features/bills/data/bill.repository'

describe('portalBillRepository', () => {
  beforeEach(() => vi.clearAllMocks())
  it('list maps rows with total and stage summary', async () => {
    const r = await portalBillRepository.list()
    expect(r[0]).toEqual({
      id: 'b1',
      billNumber: 'INV-000001',
      statusKey: 'active',
      statusLabel: 'Active',
      total: 250,
      deadline: null,
      trackedRows: 2,
      completedRows: 1,
    })
  })
  it('get returns the bill when it belongs to the signed-in user', async () => {
    expect(await portalBillRepository.get('b1')).toMatchObject({ id: 'b1' })
  })
  it('get returns null when the bill is someone else\'s', async () => {
    ;(billRepository.get as any).mockResolvedValueOnce({ id: 'b2', customerId: 'other' })
    expect(await portalBillRepository.get('b2')).toBeNull()
  })
})
```

- [ ] **Step 3: Run, expect failure.**

- [ ] **Step 4: Implement `portalBill.repository.ts`**

```ts
import { supabase } from '@/core/supabase/client'
import { billRepository } from '@/features/bills/data/bill.repository'
import type { BillDetailVM } from '@/features/bills/bills.types'
import type { PortalBillListVM } from '@/features/portal/portal.types'

interface PortalRow {
  id: string
  bill_number: string
  deadline: string | null
  bill_statuses: { key: string; label: string } | null
  bill_rows: { amount: number; deleted_at: string | null }[]
  bill_stage_summary: { tracked_rows: number; completed_rows: number } | null
}

export const portalBillRepository = {
  async list(): Promise<PortalBillListVM[]> {
    const { data, error } = await supabase
      .from('bills')
      .select(
        'id, bill_number, deadline, bill_statuses(key, label), bill_rows(amount, deleted_at), bill_stage_summary(tracked_rows, completed_rows)',
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as PortalRow[]).map((b) => ({
      id: b.id,
      billNumber: b.bill_number,
      statusKey: b.bill_statuses?.key ?? 'pending',
      statusLabel: b.bill_statuses?.label ?? 'Pending',
      total: b.bill_rows
        .filter((r) => r.deleted_at === null)
        .reduce((s, r) => s + Number(r.amount), 0),
      deadline: b.deadline,
      trackedRows: b.bill_stage_summary?.tracked_rows ?? 0,
      completedRows: b.bill_stage_summary?.completed_rows ?? 0,
    }))
  },

  async get(id: string): Promise<BillDetailVM | null> {
    const bill = await billRepository.get(id)
    if (!bill) return null
    const { data: userData } = await supabase.auth.getUser()
    return bill.customerId === userData.user?.id ? bill : null
  },
}
```

- [ ] **Step 5: Hooks**

```ts
// queries/usePortalBills.ts
import { useQuery } from '@tanstack/react-query'
import { portalBillRepository } from '@/features/portal/data/portalBill.repository'

export function usePortalBills() {
  return useQuery({ queryKey: ['portal-bills'], queryFn: portalBillRepository.list })
}
export function usePortalBill(id: string) {
  return useQuery({
    queryKey: ['portal-bill', id],
    queryFn: () => portalBillRepository.get(id),
    enabled: !!id,
  })
}
```

- [ ] **Step 6: Failing `PortalHomePage` test**

```tsx
// src/features/portal/PortalHomePage.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const bills = [
  { id: 'b1', billNumber: 'INV-000001', statusKey: 'active', statusLabel: 'Active', total: 250, deadline: null, trackedRows: 2, completedRows: 1 },
]
vi.mock('@/features/portal/queries/usePortalBills', () => ({
  usePortalBills: () => ({ data: bills, isLoading: false, isError: false }),
}))
import PortalHomePage from '@/features/portal/PortalHomePage'

describe('PortalHomePage', () => {
  it('lists the customer bills with a progress hint', () => {
    render(<MemoryRouter><PortalHomePage /></MemoryRouter>)
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run, expect failure.**

- [ ] **Step 8: Implement `PortalHomePage.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { Card } from '@/shared/ui/Card'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { usePortalBills } from '@/features/portal/queries/usePortalBills'

export default function PortalHomePage() {
  const { data, isLoading, isError } = usePortalBills()

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">My Bills</h1>

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load your bills.</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">No orders yet.</p>
      ) : (
        (data ?? []).map((b) => {
          const pct = b.trackedRows > 0 ? Math.round((b.completedRows / b.trackedRows) * 100) : 0
          return (
            <Link key={b.id} to={`/portal/bills/${b.id}`}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-neo-text-primary)]">{b.billNumber}</span>
                  <StatusBadge label={b.statusLabel} />
                </div>
                <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
                  {formatCurrency(b.total)} · due {b.deadline ?? '—'}
                </p>
                {b.trackedRows > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-neo-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-neo-primary)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--color-neo-text-secondary)]">
                      {b.completedRows} / {b.trackedRows} stages done
                    </p>
                  </div>
                )}
              </Card>
            </Link>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 9: Run tests, typecheck, lint, commit.** `feat(portal): my-bills list page`

---

## Task 10: Customer portal — PortalBillPage + manual verification

**Files:**
- Modify: `src/features/portal/PortalBillPage.tsx` (replace placeholder) (+ `.test.tsx`)

**Interfaces:**
- Consumes: `usePortalBill` (Task 9), `useWorkflowTemplates` + `useOrderTypes` (for stepper stages), `useBillHistory` + `HistoryTimeline`, `useComments` + `useAddComment` + `CommentThread`, `useAttachments` + `AttachmentList` (download only) + `attachmentRepository.signedUrl`, `useRealtimeBill`, `StageStepper` (read-only), `formatCurrency`.

- [ ] **Step 1: Implement `PortalBillPage.tsx`**

```tsx
import { Fragment } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useToast } from '@/shared/ui/Toast'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { usePortalBill } from '@/features/portal/queries/usePortalBills'
import { useWorkflowTemplates } from '@/features/settings/queries/useWorkflowTemplates'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { useBillHistory } from '@/features/tracking/queries/useBillHistory'
import { StageStepper } from '@/features/tracking/components/StageStepper'
import { HistoryTimeline } from '@/features/tracking/components/HistoryTimeline'
import { useComments } from '@/features/comments/queries/useComments'
import { useAddComment } from '@/features/comments/mutations/useAddComment'
import { CommentThread } from '@/features/comments/components/CommentThread'
import { useAttachments } from '@/features/attachments/queries/useAttachments'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'
import { useRealtimeBill } from '@/features/realtime/useRealtimeBill'

export default function PortalBillPage() {
  const { id = '' } = useParams()
  const { show } = useToast()
  useRealtimeBill(id)

  const { data: bill, isLoading } = usePortalBill(id)
  const { data: templates } = useWorkflowTemplates()
  const { data: orderTypes } = useOrderTypes()
  const history = useBillHistory(id)
  const comments = useComments(id)
  const addComment = useAddComment(id)
  const attachments = useAttachments(id)

  if (isLoading) {
    return <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">Loading…</div>
  }
  if (!bill) {
    return (
      <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">
        Bill not found. <Link className="text-[var(--color-neo-primary)]" to="/portal">Back to my bills</Link>
      </div>
    )
  }

  const stagesFor = (orderTypeId: string | null) => {
    if (!orderTypeId) return []
    const ot = (orderTypes ?? []).find((o) => o.id === orderTypeId)
    const tpl = (templates ?? []).find((t) => t.id === ot?.workflowTemplateId)
    return tpl?.stages ?? []
  }

  const balance = bill.total - bill.paidAmount

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-[var(--color-neo-text-secondary)]">
        <ArrowLeft size={16} /> My bills
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">{bill.billNumber}</h1>
        <StatusBadge label={bill.statusLabel} />
      </div>
      <p className="text-sm text-[var(--color-neo-text-secondary)]">
        Ordered {bill.orderDate} · Due {bill.deadline ?? '—'}
      </p>

      <Card className="p-4">
        <table className="w-full text-sm">
          <tbody>
            {bill.rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-[var(--color-neo-secondary)]/15">
                  <td className="py-2">{r.detail}</td>
                  <td className="py-2 text-[var(--color-neo-text-secondary)]">{r.orderTypeName ?? '—'}</td>
                  <td className="py-2 text-right">{formatCurrency(r.amount)}</td>
                </tr>
                {r.orderTypeId && (
                  <tr>
                    <td colSpan={3} className="pb-3">
                      <StageStepper stages={stagesFor(r.orderTypeId)} currentStageId={r.currentStageId ?? null} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[var(--color-neo-secondary)]/25">
            <tr><td className="pt-2 font-semibold" colSpan={2}>Total</td><td className="pt-2 text-right font-semibold">{formatCurrency(bill.total)}</td></tr>
            <tr><td className="text-[var(--color-neo-text-secondary)]" colSpan={2}>Paid</td><td className="text-right text-[var(--color-neo-text-secondary)]">{formatCurrency(bill.paidAmount)}</td></tr>
            <tr><td className="font-semibold" colSpan={2}>Balance</td><td className={`text-right font-semibold ${balance > 0 ? 'text-[var(--color-neo-danger)]' : ''}`}>{formatCurrency(balance)}</td></tr>
          </tfoot>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Progress</h2>
        <HistoryTimeline entries={history.data ?? []} />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Messages</h2>
        <CommentThread
          comments={comments.data ?? []}
          posting={addComment.isPending}
          onPost={async (body) => {
            try {
              await addComment.mutateAsync(body)
            } catch (err) {
              show({ type: 'error', title: 'Could not send', message: (err as Error).message })
            }
          }}
        />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Files</h2>
        <AttachmentList
          attachments={attachments.data ?? []}
          canManage={false}
          onUpload={() => {}}
          onRemove={() => {}}
          onDownload={async (a) => {
            try {
              const url = await attachmentRepository.signedUrl(a.storagePath)
              window.open(url, '_blank', 'noopener')
            } catch (err) {
              show({ type: 'error', title: 'Could not open file', message: (err as Error).message })
            }
          }}
        />
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Light render test** (`PortalBillPage.test.tsx`) — mock `usePortalBill` returning a bill with a tagged row; mock the other hooks empty; `useParams` id; assert "Progress", "Messages", "Files" headings render and the row detail shows; mock `usePortalBill` returning `null` → assert "Bill not found."

- [ ] **Step 3: Full verification.** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` — all pass; count up from Phase 3's 58.

- [ ] **Step 4: Commit.** `feat(portal): read-only bill detail with stages, history, messages, files`

- [ ] **Step 5: Manual walkthrough** (`supabase db reset`; `npm run dev`):
  1. As `admin@onevo.test`: create an order type + workflow (Settings) if none; create a customer for `customer@onevo.test`'s email — **or** just make a bill for the seeded `Cathy Customer` (`customer@onevo.test`). Add a row tagged with the order type. Save.
  2. On `/bills/:id`: the row shows a `StageStepper`. Click the 2nd stage → enter a note → the stepper advances, the **History** card gains an entry.
  3. **Files** card → Upload a small file → it appears; Download opens it.
  4. **Messages** card → post "Your order is being printed".
  5. Sign out; sign in as `customer@onevo.test`. `/portal` lists the bill with a progress bar. Open it: read-only stepper at the right stage, the history entry, the file (Download works), the staff message. Post a reply.
  6. Without refreshing the customer tab is not required, but: back as admin on the same bill's page (open in the other browser/session) — the customer's reply appears within ~1–2s (realtime). If Realtime is disabled at the platform level, note it; the pages still work on refresh.
  7. Try `/portal/bills/<some other id>` → "Bill not found."
  8. Report any deviation from the spec's Definition of Done (§7).

---

## Self-Review

**1. Spec coverage** — §2.1 staff tracking (Tasks 3,4,8), §2.2 portal (Tasks 9,10), §2.3 comments (Task 5, mounted 8+10), §2.4 attachments (Task 6, mounted 8+10), §2.5 realtime (Task 7, mounted 8+10), §2.6 RLS test (Task 1), §3 migration/views (Task 1), §4 architecture/types (each task), §5 UX (Tasks 4,5,6,8,9,10), §6 testing (each task), §7 DoD (Task 10 + threaded checks). No gap without a task.

**2. Placeholder scan** — no TBD/TODO; all code blocks complete. Task 8 Step 1 flags a required Phase-3 edit (add `currentStageId` to `BillRowVM` + `bill.repository` select/map + fixture) — spelled out, not left vague.

**3. Type consistency** — `HistoryEntryVM`/`CommentVM`/`AttachmentVM`/`PortalBillListVM` defined once (Tasks 3/5/6/9), consumed unchanged. Repo method names match their hooks. Query keys are consistent: `['bill-history', id]`, `['bill-comments', id]`, `['bill-attachments', id]`, `['portal-bills']`, `['portal-bill', id]`, and `useRealtimeBill` invalidates exactly those plus `['bills', id]`/`['bills']`. `StageStepper` takes `WorkflowStageVM[]` (Phase 2) — `templates[].stages` already are that type. `advance_bill_row_stage` arg names (`p_row_id`, `p_to_stage_id`, `p_note`) match the Phase 1 migration and `rpc.test.sql`.

**Known follow-ups for Phase 5:** comment edit/delete UI; per-`bill_row` attachments; notifications; the bundle-size code-split; employee-vs-admin permission split.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-01-onevo-phase-4-tracking-portal.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between.

**2. Inline Execution** — this session (or a fresh one), batch with checkpoints.

**Which approach?**
