# ONEVO Dashboard, Sales & UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Dashboard with a real overview + a `/sales` turnover screen (Recharts), swap the flat Bills/Customers rows for neumorphic cards, and rebuild the mobile bottom bar as an iOS-26 floating-glass pill.

**Architecture:** A new repository-less `features/dashboard/` module holds pure aggregation selectors over the existing `useBills()` / `useCustomers()` queries, composed by a `useSalesSummary()` hook. Presentational chart wrappers (Recharts) and card components take plain VMs + callbacks. No Supabase migration — all turnover maths is client-side.

**Tech Stack:** React 19, TypeScript, TanStack Query, Recharts, Tailwind v4 neo tokens, framer-motion, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-02-onevo-dashboard-sales-ui-design.md`

## Global Constraints

- **Do NOT run git.** End each task with a `ready to commit: <msg>` line; the user commits.
- Supabase access stays in `features/*/data/*.repository.ts`. The `features/dashboard/` module has **no** repository and calls only existing query hooks.
- View models are camelCase; DB rows stay snake_case until mapped in the repository.
- Reuse `formatCurrency` from `@/shared/utils/formatCurrency`; add no second currency helper.
- Use only the neo tokens already in `src/index.css` `@theme` (`--color-neo-*`, `--shadow-neo-*`, `--radius-neo-*`). Introduce no new colours. The one non-token literal already used in the codebase is the icon-tile gradient stop `#8b5cf6` (see `Sidebar.tsx`) — reuse it, add nothing else.
- `vitest` `test.include` is `src/**/*.{test,spec}.{ts,tsx}` — no config change needed for new tests. Tests are colocated `*.test.ts(x)`.
- `formatCurrency(n)` renders LKR like `LKR 1,234.00`. For compact chart/tile figures use the local `formatLKRShort` added in Task 4 (`LKR 1.2M` / `LKR 412k`), never a hand-rolled `Intl` call.
- Mock hooks in tests with `vi.hoisted` + `vi.mock`, following `src/features/customers/components/CustomerFormModal.test.tsx`.
- `lucide-react` in this project is version `1.38.0`. If any icon name in this plan is not exported by that build, substitute the nearest existing icon and note it in the commit message. Icons known-good (used already): `LayoutDashboard`, `Users`, `FileText`, `Settings`, `Package`, `LogOut`, `Plus`.
- Definition of done for every task: `npm run test` green, `npm run typecheck` clean, `npm run lint` clean.
- Never modify files under `supabase/`.
- `now`/`today` in selectors is an injectable last parameter defaulting to `new Date()` so tests are deterministic.

---

## File Structure

```
src/
├── shared/
│   ├── constants/
│   │   ├── routes.ts                              (modify) + sales: '/sales'
│   │   └── billStatus.ts                          (create) bucket vocabulary, filters, overdue, progress
│   └── ui/
│       ├── SegmentedControl.tsx / .test.tsx       (create) neo pill group, generic <T extends string>
│       ├── StatCard.tsx / .test.tsx               (create) KPI tile: label / value / icon / delta / sparkline
│       └── Sparkline.tsx / .test.tsx              (create) inline-SVG polyline
├── features/
│   ├── dashboard/
│   │   ├── dashboard.types.ts                     (create) aggregate VM shapes
│   │   ├── dashboard.selectors.ts / .test.ts      (create) pure aggregation
│   │   ├── queries/useSalesSummary.ts / .test.tsx (create) compose useBills + useCustomers
│   │   ├── DashboardPage.tsx / .test.tsx          (replace PlaceholderPage)
│   │   ├── SalesPage.tsx / .test.tsx              (create)
│   │   └── components/
│   │       ├── TurnoverBarChart.tsx / .test.tsx   (create) Recharts BarChart wrapper
│   │       ├── CollectionDonut.tsx / .test.tsx    (create) Recharts PieChart wrapper
│   │       ├── HBarList.tsx / .test.tsx           (create) CSS horizontal-bar list
│   │       ├── StatusBreakdownBar.tsx / .test.tsx (create) stacked bar + legend
│   │       └── RecentBillsList.tsx / .test.tsx    (create) compact bill rows
│   ├── bills/
│   │   ├── bills.types.ts                         (modify) + rowsByType on BillListItemVM
│   │   ├── data/bill.repository.ts / .test.ts     (modify) map rowsByType
│   │   ├── components/
│   │   │   ├── BillCard.tsx / .test.tsx           (create)
│   │   │   └── BillList.tsx / .test.tsx           (rewrite → grid of BillCard)
│   │   └── BillsPage.tsx / .test.tsx              (modify) pill search + filter chips
│   └── customers/
│       ├── components/
│       │   ├── CustomerCard.tsx / .test.tsx       (create)
│       │   └── CustomerList.tsx / .test.tsx       (rewrite → grid of CustomerCard)
│       └── CustomersPage.tsx                      (modify) search styling only
├── components/navigation/
│   ├── navConfig.tsx                              (modify) + Sales NavItem
│   ├── Sidebar.tsx                                (modify) render Sales item (already maps STAFF_NAV — no code change if it maps the array)
│   └── MobileBottomBar.tsx / .test.tsx            (rewrite → glass floating pill)
├── layouts/AppLayout.tsx                          (modify) bottom padding 54px → 88px
├── app/router/AppRouter.tsx                       (modify) + /sales route
└── vitest.setup.ts                               (modify) + ResizeObserver polyfill
```

---

## Task 1: Add Recharts + jsdom ResizeObserver polyfill

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `vitest.setup.ts`
- Test: `src/features/dashboard/recharts-smoke.test.tsx` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `recharts` importable; `globalThis.ResizeObserver` defined in the jsdom test env.

- [ ] **Step 1: Install Recharts**

Run: `npm install recharts`
Expected: `package.json` gains `"recharts": "^<version>"` under `dependencies`; install completes (peer-dep warnings about React are acceptable, errors are not).

- [ ] **Step 2: Read the current setup file**

Run: `cat vitest.setup.ts`
Note its existing contents (jest-dom import etc.) — you will append, not replace.

- [ ] **Step 3: Append the ResizeObserver polyfill to `vitest.setup.ts`**

```ts
// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof globalThis.ResizeObserver
}
```

- [ ] **Step 4: Write the smoke test**

```tsx
import { render } from '@testing-library/react'
import { BarChart, Bar, XAxis } from 'recharts'

it('recharts renders in jsdom with an explicit size', () => {
  const { container } = render(
    <BarChart width={300} height={160} data={[{ name: 'a', v: 1 }, { name: 'b', v: 2 }]}>
      <XAxis dataKey="name" />
      <Bar dataKey="v" />
    </BarChart>,
  )
  expect(container.querySelector('svg')).not.toBeNull()
})
```

- [ ] **Step 5: Run the test**

Run: `npm run test -- recharts-smoke`
Expected: PASS.

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 7: Ready to commit**

`ready to commit: build: add recharts + ResizeObserver test polyfill`

---

## Task 2: Bill-status vocabulary — `shared/constants/billStatus.ts`

**Files:**
- Create: `src/shared/constants/billStatus.ts`
- Test: `src/shared/constants/billStatus.test.ts`

**Interfaces:**
- Consumes: `BillListItemVM` (type only) from `@/features/bills/bills.types`.
- Produces:
  - `type StatusBucket = 'open' | 'active' | 'done'`
  - `bucketOf(statusKey: string): StatusBucket`
  - `BUCKET_COLOR: Record<StatusBucket, string>` (neo CSS-var strings)
  - `BUCKET_LABEL: Record<StatusBucket, string>`
  - `progressFromBucket(statusKey: string): number` (0 | 60 | 100)
  - `isOverdue(bill: Pick<BillListItemVM, 'deadline' | 'statusKey'>, now?: Date): boolean`
  - `type BillFilterKey = 'all' | 'open' | 'active' | 'done' | 'overdue'`
  - `BILL_FILTERS: { key: BillFilterKey; label: string }[]`
  - `matchesFilter(bill: Pick<BillListItemVM, 'deadline' | 'statusKey'>, key: BillFilterKey, now?: Date): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import {
  bucketOf, progressFromBucket, isOverdue, matchesFilter,
} from '@/shared/constants/billStatus'

describe('billStatus', () => {
  it('maps known status keys to buckets', () => {
    expect(bucketOf('pending')).toBe('open')
    expect(bucketOf('in_progress')).toBe('active')
    expect(bucketOf('active')).toBe('active')
    expect(bucketOf('completed')).toBe('done')
    expect(bucketOf('paid')).toBe('done')
  })

  it('falls back to open for unknown keys', () => {
    expect(bucketOf('weird_custom_status')).toBe('open')
  })

  it('derives coarse progress from the bucket', () => {
    expect(progressFromBucket('pending')).toBe(0)
    expect(progressFromBucket('active')).toBe(60)
    expect(progressFromBucket('completed')).toBe(100)
  })

  it('isOverdue: past deadline and not done', () => {
    const now = new Date('2026-09-02T10:00:00')
    expect(isOverdue({ deadline: '2026-08-30', statusKey: 'active' }, now)).toBe(true)
    expect(isOverdue({ deadline: '2026-09-30', statusKey: 'active' }, now)).toBe(false)
    expect(isOverdue({ deadline: '2026-08-30', statusKey: 'completed' }, now)).toBe(false)
    expect(isOverdue({ deadline: null, statusKey: 'active' }, now)).toBe(false)
  })

  it('matchesFilter', () => {
    const now = new Date('2026-09-02T10:00:00')
    const b = { deadline: '2026-08-30', statusKey: 'active' as const }
    expect(matchesFilter(b, 'all', now)).toBe(true)
    expect(matchesFilter(b, 'active', now)).toBe(true)
    expect(matchesFilter(b, 'open', now)).toBe(false)
    expect(matchesFilter(b, 'overdue', now)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it — expect module-not-found FAIL**

Run: `npm run test -- billStatus`
Expected: FAIL (cannot find `@/shared/constants/billStatus`).

- [ ] **Step 3: Implement `billStatus.ts`**

```ts
import type { BillListItemVM } from '@/features/bills/bills.types'

export type StatusBucket = 'open' | 'active' | 'done'

const BUCKET_BY_KEY: Record<string, StatusBucket> = {
  pending: 'open', draft: 'open', new: 'open', quote: 'open',
  active: 'active', in_progress: 'active', 'in-progress': 'active',
  completed: 'done', paid: 'done', delivered: 'done', done: 'done',
}

export function bucketOf(statusKey: string): StatusBucket {
  return BUCKET_BY_KEY[statusKey] ?? 'open'
}

export const BUCKET_COLOR: Record<StatusBucket, string> = {
  open: 'var(--color-neo-secondary)',
  active: 'var(--color-neo-primary)',
  done: 'var(--color-neo-success)',
}

export const BUCKET_LABEL: Record<StatusBucket, string> = {
  open: 'Pending',
  active: 'In progress',
  done: 'Completed',
}

export function progressFromBucket(statusKey: string): number {
  const b = bucketOf(statusKey)
  return b === 'done' ? 100 : b === 'active' ? 60 : 0
}

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function isOverdue(
  bill: Pick<BillListItemVM, 'deadline' | 'statusKey'>,
  now: Date = new Date(),
): boolean {
  if (!bill.deadline) return false
  if (bucketOf(bill.statusKey) === 'done') return false
  return new Date(bill.deadline) < startOfToday(now)
}

export type BillFilterKey = 'all' | 'open' | 'active' | 'done' | 'overdue'

export const BILL_FILTERS: { key: BillFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Pending' },
  { key: 'active', label: 'In progress' },
  { key: 'done', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
]

export function matchesFilter(
  bill: Pick<BillListItemVM, 'deadline' | 'statusKey'>,
  key: BillFilterKey,
  now: Date = new Date(),
): boolean {
  if (key === 'all') return true
  if (key === 'overdue') return isOverdue(bill, now)
  return bucketOf(bill.statusKey) === key
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- billStatus`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: bill-status bucket vocabulary + filters`

---

## Task 3: `SegmentedControl` shared UI

**Files:**
- Create: `src/shared/ui/SegmentedControl.tsx`
- Test: `src/shared/ui/SegmentedControl.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/shared/utils/cn`.
- Produces:
  ```ts
  interface SegmentedControlProps<T extends string> {
    options: { value: T; label: string }[]
    value: T
    onChange: (value: T) => void
    ariaLabel: string
  }
  export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'

function Harness() {
  const [v, setV] = useState<'d' | 'm' | 'y'>('m')
  return (
    <>
      <SegmentedControl
        ariaLabel="Range"
        value={v}
        onChange={setV}
        options={[
          { value: 'd', label: 'Daily' },
          { value: 'm', label: 'Monthly' },
          { value: 'y', label: 'Yearly' },
        ]}
      />
      <output>{v}</output>
    </>
  )
}

describe('SegmentedControl', () => {
  it('marks the active option and switches on click', async () => {
    render(<Harness />)
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Yearly' }))
    expect(screen.getByText('y')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Yearly' })).toBeChecked()
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`npm run test -- SegmentedControl`)

- [ ] **Step 3: Implement `SegmentedControl.tsx`**

```tsx
import { cn } from '@/shared/utils/cn'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] p-1 shadow-[var(--shadow-neo-pressed)]"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-7 rounded-[var(--radius-neo-pill)] px-4 text-xs font-semibold transition-colors',
              active
                ? 'bg-[var(--color-neo-card)] text-[var(--color-neo-primary)] shadow-[var(--shadow-neo-soft)]'
                : 'text-[var(--color-neo-text-secondary)]',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run the test — expect PASS**

- [ ] **Step 5: Typecheck + lint** (`npm run typecheck && npm run lint`)

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: SegmentedControl shared UI`

---

## Task 4: `formatLKRShort`, `Sparkline`, `StatCard`

**Files:**
- Create: `src/shared/utils/formatLKRShort.ts` + `.test.ts`
- Create: `src/shared/ui/Sparkline.tsx` + `.test.tsx`
- Create: `src/shared/ui/StatCard.tsx` + `.test.tsx`

**Interfaces:**
- Consumes: `cn`.
- Produces:
  - `formatLKRShort(n: number): string` — `LKR 0` / `LKR 412k` / `LKR 5.2M`
  - `Sparkline({ values, className }: { values: number[]; className?: string })` — a `<svg>` polyline, `viewBox="0 0 96 28"`, `preserveAspectRatio="none"`, stroke `var(--color-neo-primary)`, no axes; renders nothing when `values.length < 2`.
  - ```ts
    interface StatCardProps {
      label: string
      value: string
      icon: LucideIcon
      tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' // icon-tile tint, default 'primary'
      deltaPct?: number        // signed; shows ▲ green / ▼ red
      sub?: string
      spark?: number[]
    }
    export function StatCard(props: StatCardProps): JSX.Element
    ```
    (`LucideIcon` type: `import type { LucideIcon } from 'lucide-react'`.)

- [ ] **Step 1: Write the failing tests**

`formatLKRShort.test.ts`:
```ts
import { formatLKRShort } from '@/shared/utils/formatLKRShort'

it('formats short LKR amounts', () => {
  expect(formatLKRShort(0)).toBe('LKR 0')
  expect(formatLKRShort(412_000)).toBe('LKR 412k')
  expect(formatLKRShort(5_240_000)).toBe('LKR 5.2M')
  expect(formatLKRShort(940_000)).toBe('LKR 940k')
  expect(formatLKRShort(1_500)).toBe('LKR 1.5k')
})
```

`Sparkline.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { Sparkline } from '@/shared/ui/Sparkline'

it('draws a polyline for >= 2 points and nothing for fewer', () => {
  const { container, rerender } = render(<Sparkline values={[1, 4, 2, 6]} />)
  expect(container.querySelector('polyline')).not.toBeNull()
  rerender(<Sparkline values={[3]} />)
  expect(container.querySelector('polyline')).toBeNull()
})
```

`StatCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { TrendingUp } from 'lucide-react'
import { StatCard } from '@/shared/ui/StatCard'

it('renders label, value, positive delta and sub', () => {
  render(
    <StatCard label="Outstanding" value="LKR 412k" icon={TrendingUp} deltaPct={7} sub="7 bills" spark={[1, 2, 3]} />,
  )
  expect(screen.getByText('Outstanding')).toBeInTheDocument()
  expect(screen.getByText('LKR 412k')).toBeInTheDocument()
  expect(screen.getByText('+7%')).toBeInTheDocument()
  expect(screen.getByText('7 bills')).toBeInTheDocument()
})

it('shows a negative delta with a minus sign', () => {
  render(<StatCard label="Collection" value="72%" icon={TrendingUp} deltaPct={-3} />)
  expect(screen.getByText('-3%')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run them — expect FAIL** (`npm run test -- formatLKRShort Sparkline StatCard`)

- [ ] **Step 3: Implement `formatLKRShort.ts`**

```ts
export function formatLKRShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `LKR ${trim(n / 1_000_000)}M`
  if (abs >= 1_000) return `LKR ${trim(n / 1_000)}k`
  return `LKR ${Math.round(n)}`
}

function trim(x: number): string {
  const r = Math.round(x * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}
```

- [ ] **Step 4: Implement `Sparkline.tsx`**

```tsx
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const w = 96
  const h = 28
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        stroke="var(--color-neo-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

- [ ] **Step 5: Implement `StatCard.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Card } from '@/shared/ui/Card'
import { Sparkline } from '@/shared/ui/Sparkline'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const TILE: Record<Tone, string> = {
  primary: 'bg-[var(--color-neo-primary)]/12 text-[var(--color-neo-primary)]',
  success: 'bg-[var(--color-neo-success)]/14 text-[var(--color-neo-success)]',
  warning: 'bg-[var(--color-neo-warning)]/18 text-[#a9750b]',
  danger: 'bg-[var(--color-neo-danger)]/12 text-[var(--color-neo-danger)]',
  neutral: 'bg-[var(--color-neo-text-secondary)]/16 text-[var(--color-neo-text-secondary)]',
}

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: Tone
  deltaPct?: number
  sub?: string
  spark?: number[]
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', deltaPct, sub, spark }: StatCardProps) {
  const up = (deltaPct ?? 0) >= 0
  return (
    <Card className="p-[18px]">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
          {label}
        </span>
        <span className={cn('flex h-[34px] w-[34px] items-center justify-center rounded-[10px]', TILE[tone])}>
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-2.5 text-[26px] font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">
        {value}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {deltaPct !== undefined ? (
          <span
            className={cn(
              'text-[11px] font-bold',
              up ? 'text-[var(--color-neo-success)]' : 'text-[var(--color-neo-danger)]',
            )}
          >
            {up ? '+' : ''}
            {Math.round(deltaPct)}%
          </span>
        ) : (
          <span />
        )}
        {spark && <Sparkline values={spark} className="h-7 w-24" />}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--color-neo-text-secondary)]">{sub}</div>}
    </Card>
  )
}
```

- [ ] **Step 6: Run the tests — expect PASS** (`npm run test -- formatLKRShort Sparkline StatCard`)

- [ ] **Step 7: Typecheck + lint**

- [ ] **Step 8: Ready to commit**

`ready to commit: feat: formatLKRShort, Sparkline, StatCard`

---

## Task 5: `/sales` route + Sales sidebar item (temporary page)

Wires the route and desktop-nav entry now, pointing at a placeholder; Task 17 swaps in the real `SalesPage`. The mobile bottom bar must **not** gain a 5th tab.

**Files:**
- Modify: `src/shared/constants/routes.ts`
- Modify: `src/components/navigation/navConfig.tsx`
- Modify: `src/components/navigation/Sidebar.tsx`
- Modify: `src/app/router/AppRouter.tsx`
- Test: `src/components/navigation/navConfig.test.tsx` (create)

**Interfaces:**
- Consumes: `PlaceholderPage` from `@/shared/ui/PlaceholderPage`; `STAFF_NAV`, `NavItem` from `@/components/navigation/navConfig`.
- Produces:
  - `ROUTES.sales === '/sales'`
  - `SIDEBAR_NAV: NavItem[]` exported from `navConfig.tsx` = `STAFF_NAV` + a Sales item (`to: ROUTES.sales`, `label: 'Sales'`, `shortLabel: 'Sales'`, `icon: TrendingUp`)
  - `STAFF_NAV` unchanged (still the 4 mobile tabs)

- [ ] **Step 1: Write the failing test**

```tsx
import { STAFF_NAV, SIDEBAR_NAV } from '@/components/navigation/navConfig'
import { ROUTES } from '@/shared/constants/routes'

describe('nav config', () => {
  it('keeps the mobile bar at 4 tabs', () => {
    expect(STAFF_NAV).toHaveLength(4)
    expect(STAFF_NAV.some((n) => n.to === ROUTES.sales)).toBe(false)
  })

  it('adds Sales to the sidebar only', () => {
    expect(SIDEBAR_NAV).toHaveLength(5)
    expect(SIDEBAR_NAV.at(-1)).toMatchObject({ to: '/sales', label: 'Sales' })
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`npm run test -- navConfig`)

- [ ] **Step 3: Add the route constant**

In `src/shared/constants/routes.ts`, add `sales: '/sales',` to the `ROUTES` object (place it right after `bills: '/bills',`).

- [ ] **Step 4: Extend `navConfig.tsx`**

Add `TrendingUp` to the `lucide-react` import. After the existing `STAFF_NAV` declaration add:

```tsx
export const SIDEBAR_NAV: NavItem[] = [
  ...STAFF_NAV,
  { to: ROUTES.sales, label: 'Sales', shortLabel: 'Sales', icon: TrendingUp },
]
```

- [ ] **Step 5: Point `Sidebar.tsx` at `SIDEBAR_NAV`**

In `src/components/navigation/Sidebar.tsx` change the import `STAFF_NAV` → `SIDEBAR_NAV` and the `.map` source from `STAFF_NAV` to `SIDEBAR_NAV`. Leave `MobileBottomBar.tsx` importing `STAFF_NAV`.

- [ ] **Step 6: Add the route**

In `src/app/router/AppRouter.tsx`: add `import { PlaceholderPage } from '@/shared/ui/PlaceholderPage'` and, inside the staff `<Route element={<AppLayout />}>` block after the `bills` detail route:

```tsx
<Route path={ROUTES.sales} element={<PlaceholderPage title="Sales" note="Coming in this refresh." />} />
```

- [ ] **Step 7: Run tests + typecheck + lint**

Run: `npm run test -- navConfig && npm run typecheck && npm run lint`
Expected: PASS / clean. (If `TrendingUp` is not exported by `lucide-react@1.38`, use `BarChart3` or `LineChart`; note the swap.)

- [ ] **Step 8: Ready to commit**

`ready to commit: feat: /sales route + Sales sidebar item (placeholder)`

---

## Task 6: `rowsByType` on `BillListItemVM`

**Files:**
- Modify: `src/features/bills/bills.types.ts`
- Modify: `src/features/bills/data/bill.repository.ts`
- Test: `src/features/bills/data/bill.repository.test.ts` (extend)

**Interfaces:**
- Consumes: nothing new.
- Produces: `BillListItemVM.rowsByType: Record<string, number>` — per-bill sum of live-row `amount` keyed by `order_types.name`, with `null` names bucketed under `'Unassigned'`.

- [ ] **Step 1: Read the current repository + test**

Run: `sed -n '1,80p' src/features/bills/data/bill.repository.ts && echo --- && sed -n '1,60p' src/features/bills/data/bill.repository.test.ts`
Note `liveRows()` (already maps `orderTypeName`) and `toListItem()`.

- [ ] **Step 2: Add the failing test case** to `bill.repository.test.ts` (inside the existing `describe`)

```ts
it('rolls row amounts up by order type, bucketing null names as Unassigned', () => {
  const row = {
    id: 'b1',
    bill_number: 'BILL-1',
    customer_id: 'c1',
    order_date: '2026-08-01',
    deadline: null,
    paid_amount: 0,
    profiles: { full_name: 'A', email: 'a@x.co', phone: null },
    bill_statuses: { key: 'pending', label: 'Pending' },
    bill_rows: [
      { id: 'r1', detail: 'x', order_type_id: 'o1', amount: 100, deleted_at: null, current_stage_id: null, order_types: { name: 'Printing' } },
      { id: 'r2', detail: 'y', order_type_id: 'o1', amount: 50, deleted_at: null, current_stage_id: null, order_types: { name: 'Printing' } },
      { id: 'r3', detail: 'z', order_type_id: null, amount: 25, deleted_at: null, current_stage_id: null, order_types: null },
    ],
  }
  // Reuse whatever harness the existing tests use to feed `row` through `billRepository.list()`.
  // Assert on the mapped VM:
  //   expect(vm.rowsByType).toEqual({ Printing: 150, Unassigned: 25 })
})
```

Adapt the wiring to the file's existing Supabase mock (the other tests in this file show the pattern). The assertion is `expect(vm.rowsByType).toEqual({ Printing: 150, Unassigned: 25 })`.

- [ ] **Step 3: Run it — expect FAIL** (`npm run test -- bill.repository`)

- [ ] **Step 4: Add the field to the type**

In `bills.types.ts`, add to `BillListItemVM`:

```ts
  rowsByType: Record<string, number>
```

- [ ] **Step 5: Populate it in `toListItem()`**

In `bill.repository.ts`, inside `toListItem`, after `const rows = liveRows(b.bill_rows)`:

```ts
  const rowsByType = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.orderTypeName ?? 'Unassigned'
    acc[key] = (acc[key] ?? 0) + r.amount
    return acc
  }, {})
```

and add `rowsByType,` to the returned object.

- [ ] **Step 6: Run tests + typecheck + lint** (`npm run test -- bill.repository && npm run typecheck && npm run lint`)

- [ ] **Step 7: Ready to commit**

`ready to commit: feat: rowsByType rollup on bill list VM`

---

## Task 7: `dashboard.types.ts` + time-bucket selectors

**Files:**
- Create: `src/features/dashboard/dashboard.types.ts`
- Create: `src/features/dashboard/dashboard.selectors.ts`
- Test: `src/features/dashboard/dashboard.selectors.test.ts`

**Interfaces:**
- Consumes: `BillListItemVM` from `@/features/bills/bills.types`.
- Produces (in `dashboard.types.ts`):
  ```ts
  export interface DayTurnover { date: string; turnover: number }      // date = YYYY-MM-DD
  export interface MonthTurnover { month: string; turnover: number }   // month = YYYY-MM
  export interface YearTurnover { year: number; turnover: number; ytd: boolean }
  export interface NamedTurnover { name: string; turnover: number }
  export interface DashboardKpisVM {
    outstandingTotal: number
    outstandingCount: number
    inProgressCount: number
    completedCount: number
    customerCount: number
    thisMonthTurnover: number
    lastMonthTurnover: number
    momChangePct: number
    ytdTurnover: number
    avgBillValue: number
    collectionRate: number   // 0..1
    collectedTotal: number
  }
  export interface SalesSummaryVM {
    kpis: DashboardKpisVM
    byDay: DayTurnover[]
    byMonth: MonthTurnover[]
    byYear: YearTurnover[]
    topCustomers: NamedTurnover[]
    byOrderType: NamedTurnover[]
  }
  ```
- Produces (in `dashboard.selectors.ts`), this task:
  - `turnoverByDay(bills: BillListItemVM[], days?: number, today?: Date): DayTurnover[]`
  - `turnoverByMonth(bills: BillListItemVM[], months?: number, today?: Date): MonthTurnover[]`
  - `turnoverByYear(bills: BillListItemVM[], today?: Date): YearTurnover[]`

- [ ] **Step 1: Write the failing test**

```ts
import { turnoverByDay, turnoverByMonth, turnoverByYear } from '@/features/dashboard/dashboard.selectors'
import type { BillListItemVM } from '@/features/bills/bills.types'

const bill = (over: Partial<BillListItemVM>): BillListItemVM => ({
  id: 'x', billNumber: 'B', customerId: 'c', customerName: 'C',
  statusKey: 'pending', statusLabel: 'Pending', total: 0, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...over,
})

const today = new Date('2026-09-02T12:00:00')

describe('time-bucket selectors', () => {
  it('turnoverByDay: zero-filled window ending today, newest last', () => {
    const out = turnoverByDay(
      [bill({ orderDate: '2026-09-02', total: 30 }), bill({ orderDate: '2026-09-01', total: 10 }), bill({ orderDate: '2026-08-20', total: 999 })],
      3,
      today,
    )
    expect(out).toEqual([
      { date: '2026-08-31', turnover: 0 },
      { date: '2026-09-01', turnover: 10 },
      { date: '2026-09-02', turnover: 30 },
    ])
  })

  it('turnoverByMonth: last N months, zero-filled', () => {
    const out = turnoverByMonth([bill({ orderDate: '2026-09-15', total: 5 }), bill({ orderDate: '2026-08-01', total: 7 })], 3, today)
    expect(out).toEqual([
      { month: '2026-07', turnover: 0 },
      { month: '2026-08', turnover: 7 },
      { month: '2026-09', turnover: 5 },
    ])
  })

  it('turnoverByYear: earliest order year..current, current flagged ytd', () => {
    const out = turnoverByYear([bill({ orderDate: '2024-03-01', total: 100 }), bill({ orderDate: '2026-01-01', total: 40 })], today)
    expect(out).toEqual([
      { year: 2024, turnover: 100, ytd: false },
      { year: 2025, turnover: 0, ytd: false },
      { year: 2026, turnover: 40, ytd: true },
    ])
  })

  it('empty input never yields NaN', () => {
    expect(turnoverByDay([], 2, today)).toEqual([
      { date: '2026-09-01', turnover: 0 },
      { date: '2026-09-02', turnover: 0 },
    ])
    expect(turnoverByYear([], today)).toEqual([{ year: 2026, turnover: 0, ytd: true }])
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`npm run test -- dashboard.selectors`)

- [ ] **Step 3: Implement the three selectors** in `dashboard.selectors.ts`

```ts
import type { BillListItemVM } from '@/features/bills/bills.types'
import type { DayTurnover, MonthTurnover, YearTurnover } from '@/features/dashboard/dashboard.types'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function turnoverByDay(bills: BillListItemVM[], days = 14, today: Date = new Date()): DayTurnover[] {
  const buckets = new Map<string, number>()
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const k = ymd(d)
    keys.push(k)
    buckets.set(k, 0)
  }
  for (const b of bills) {
    const k = b.orderDate.slice(0, 10)
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + b.total)
  }
  return keys.map((date) => ({ date, turnover: buckets.get(date)! }))
}

export function turnoverByMonth(bills: BillListItemVM[], months = 12, today: Date = new Date()): MonthTurnover[] {
  const buckets = new Map<string, number>()
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const k = ym(d)
    keys.push(k)
    buckets.set(k, 0)
  }
  for (const b of bills) {
    const k = b.orderDate.slice(0, 7)
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + b.total)
  }
  return keys.map((month) => ({ month, turnover: buckets.get(month)! }))
}

export function turnoverByYear(bills: BillListItemVM[], today: Date = new Date()): YearTurnover[] {
  const currentYear = today.getFullYear()
  const earliest = bills.reduce((min, b) => {
    const y = Number(b.orderDate.slice(0, 4))
    return Number.isFinite(y) && y < min ? y : min
  }, currentYear)
  const out: YearTurnover[] = []
  for (let y = earliest; y <= currentYear; y++) {
    const turnover = bills
      .filter((b) => Number(b.orderDate.slice(0, 4)) === y)
      .reduce((s, b) => s + b.total, 0)
    out.push({ year: y, turnover, ytd: y === currentYear })
  }
  return out
}
```

- [ ] **Step 4: Run the test — expect PASS**

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: dashboard time-bucket turnover selectors`

---

## Task 8: KPI + ranking selectors

**Files:**
- Modify: `src/features/dashboard/dashboard.selectors.ts`
- Test: `src/features/dashboard/dashboard.selectors.test.ts` (extend)

**Interfaces:**
- Consumes: `bucketOf` from `@/shared/constants/billStatus`; `CustomerVM` from `@/features/customers/customers.types`.
- Produces:
  - `dashboardKpis(bills: BillListItemVM[], customers: CustomerVM[], today?: Date): DashboardKpisVM`
  - `topCustomersByTurnover(bills: BillListItemVM[], n?: number): NamedTurnover[]`
  - `turnoverByOrderType(bills: BillListItemVM[]): NamedTurnover[]`

- [ ] **Step 1: Add failing tests** (new `describe` block in the same file)

```ts
import { dashboardKpis, topCustomersByTurnover, turnoverByOrderType } from '@/features/dashboard/dashboard.selectors'
import type { CustomerVM } from '@/features/customers/customers.types'

describe('kpi + ranking selectors', () => {
  const t = new Date('2026-09-02T12:00:00')
  const b = (o: Partial<BillListItemVM>): BillListItemVM => ({
    id: 'x', billNumber: 'B', customerId: 'c', customerName: 'C',
    statusKey: 'pending', statusLabel: 'Pending', total: 0, paidAmount: 0,
    orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...o,
  })

  it('dashboardKpis: outstanding, counts, MoM, avg, collection', () => {
    const bills = [
      b({ statusKey: 'pending', total: 100, paidAmount: 0, orderDate: '2026-09-01' }),
      b({ statusKey: 'in_progress', total: 200, paidAmount: 50, orderDate: '2026-09-10' }),
      b({ statusKey: 'completed', total: 300, paidAmount: 300, orderDate: '2026-08-15' }),
    ]
    const customers = [{ profileId: 'c1' } as CustomerVM, { profileId: 'c2' } as CustomerVM]
    const k = dashboardKpis(bills, customers, t)
    expect(k.outstandingTotal).toBe(250)        // 100 + 150
    expect(k.outstandingCount).toBe(2)
    expect(k.inProgressCount).toBe(1)
    expect(k.completedCount).toBe(1)
    expect(k.customerCount).toBe(2)
    expect(k.thisMonthTurnover).toBe(300)       // Sep: 100 + 200
    expect(k.lastMonthTurnover).toBe(300)       // Aug: 300
    expect(k.momChangePct).toBe(0)
    expect(k.ytdTurnover).toBe(600)
    expect(k.avgBillValue).toBe(200)
    expect(k.collectionRate).toBeCloseTo(350 / 600)
    expect(k.collectedTotal).toBe(350)
  })

  it('dashboardKpis: empty -> all zeros, no NaN', () => {
    const k = dashboardKpis([], [], t)
    expect(k.avgBillValue).toBe(0)
    expect(k.collectionRate).toBe(0)
    expect(k.momChangePct).toBe(0)
  })

  it('topCustomersByTurnover: grouped, desc, capped', () => {
    const out = topCustomersByTurnover(
      [b({ customerName: 'A', total: 100 }), b({ customerName: 'B', total: 300 }), b({ customerName: 'A', total: 50 })],
      2,
    )
    expect(out).toEqual([{ name: 'B', turnover: 300 }, { name: 'A', turnover: 150 }])
  })

  it('turnoverByOrderType: summed across bills, desc', () => {
    const out = turnoverByOrderType([
      b({ rowsByType: { Printing: 100, Design: 40 } }),
      b({ rowsByType: { Printing: 60, Unassigned: 25 } }),
    ])
    expect(out).toEqual([
      { name: 'Printing', turnover: 160 },
      { name: 'Design', turnover: 40 },
      { name: 'Unassigned', turnover: 25 },
    ])
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- dashboard.selectors`)

- [ ] **Step 3: Implement** (append to `dashboard.selectors.ts`)

```ts
import { bucketOf } from '@/shared/constants/billStatus'
import type { CustomerVM } from '@/features/customers/customers.types'
import type { DashboardKpisVM, NamedTurnover } from '@/features/dashboard/dashboard.types'

export function dashboardKpis(
  bills: BillListItemVM[],
  customers: CustomerVM[],
  today: Date = new Date(),
): DashboardKpisVM {
  const thisMonth = ym(today)
  const lastMonth = ym(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  const thisYear = String(today.getFullYear())

  let outstandingTotal = 0
  let outstandingCount = 0
  let inProgressCount = 0
  let completedCount = 0
  let thisMonthTurnover = 0
  let lastMonthTurnover = 0
  let ytdTurnover = 0
  let sumTotal = 0
  let sumPaid = 0

  for (const bill of bills) {
    const bucket = bucketOf(bill.statusKey)
    const pending = bill.total - bill.paidAmount
    if (bucket !== 'done' && pending > 0) {
      outstandingTotal += pending
      outstandingCount++
    }
    if (bucket === 'active') inProgressCount++
    if (bucket === 'done') completedCount++
    const mk = bill.orderDate.slice(0, 7)
    if (mk === thisMonth) thisMonthTurnover += bill.total
    if (mk === lastMonth) lastMonthTurnover += bill.total
    if (bill.orderDate.slice(0, 4) === thisYear) ytdTurnover += bill.total
    sumTotal += bill.total
    sumPaid += bill.paidAmount
  }

  const momChangePct =
    lastMonthTurnover === 0
      ? thisMonthTurnover === 0
        ? 0
        : 100
      : ((thisMonthTurnover - lastMonthTurnover) / lastMonthTurnover) * 100

  return {
    outstandingTotal,
    outstandingCount,
    inProgressCount,
    completedCount,
    customerCount: customers.length,
    thisMonthTurnover,
    lastMonthTurnover,
    momChangePct,
    ytdTurnover,
    avgBillValue: bills.length === 0 ? 0 : sumTotal / bills.length,
    collectionRate: sumTotal === 0 ? 0 : sumPaid / sumTotal,
    collectedTotal: sumPaid,
  }
}

export function topCustomersByTurnover(bills: BillListItemVM[], n = 5): NamedTurnover[] {
  const map = new Map<string, number>()
  for (const b of bills) map.set(b.customerName, (map.get(b.customerName) ?? 0) + b.total)
  return [...map.entries()]
    .map(([name, turnover]) => ({ name, turnover }))
    .sort((a, b) => b.turnover - a.turnover)
    .slice(0, n)
}

export function turnoverByOrderType(bills: BillListItemVM[]): NamedTurnover[] {
  const map = new Map<string, number>()
  for (const b of bills) {
    for (const [type, amount] of Object.entries(b.rowsByType)) {
      map.set(type, (map.get(type) ?? 0) + amount)
    }
  }
  return [...map.entries()]
    .map(([name, turnover]) => ({ name, turnover }))
    .sort((a, b) => b.turnover - a.turnover)
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: dashboard KPI + ranking selectors`

---

## Task 9: `useSalesSummary` hook

**Files:**
- Create: `src/features/dashboard/queries/useSalesSummary.ts`
- Test: `src/features/dashboard/queries/useSalesSummary.test.tsx`

**Interfaces:**
- Consumes: `useBills` from `@/features/bills/queries/useBills`; `useCustomers` from `@/features/customers/queries/useCustomers`; all selectors from Tasks 7–8; `SalesSummaryVM` from `dashboard.types`.
- Produces: `useSalesSummary(): { data: SalesSummaryVM | undefined; isLoading: boolean; isError: boolean }`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook } from '@testing-library/react'

const h = vi.hoisted(() => ({ bills: vi.fn(), customers: vi.fn() }))
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: h.bills }))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: h.customers }))

import { useSalesSummary } from '@/features/dashboard/queries/useSalesSummary'

const billRow = {
  id: 'b1', billNumber: 'B1', customerId: 'c1', customerName: 'Ravi',
  statusKey: 'in_progress', statusLabel: 'In progress', total: 200, paidAmount: 50,
  orderDate: '2026-09-01', deadline: null, rowsByType: { Printing: 200 },
}

describe('useSalesSummary', () => {
  it('is loading until both queries resolve', () => {
    h.bills.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    h.customers.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { result } = renderHook(() => useSalesSummary())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('composes selectors when data is present', () => {
    h.bills.mockReturnValue({ data: [billRow], isLoading: false, isError: false })
    h.customers.mockReturnValue({ data: [{ profileId: 'c1' }], isLoading: false, isError: false })
    const { result } = renderHook(() => useSalesSummary())
    expect(result.current.data?.kpis.customerCount).toBe(1)
    expect(result.current.data?.byOrderType).toEqual([{ name: 'Printing', turnover: 200 }])
    expect(result.current.data?.byMonth).toHaveLength(12)
  })

  it('surfaces error from either query', () => {
    h.bills.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    h.customers.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { result } = renderHook(() => useSalesSummary())
    expect(result.current.isError).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- useSalesSummary`)

- [ ] **Step 3: Implement `useSalesSummary.ts`**

```ts
import { useMemo } from 'react'
import { useBills } from '@/features/bills/queries/useBills'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import {
  turnoverByDay,
  turnoverByMonth,
  turnoverByYear,
  dashboardKpis,
  topCustomersByTurnover,
  turnoverByOrderType,
} from '@/features/dashboard/dashboard.selectors'
import type { SalesSummaryVM } from '@/features/dashboard/dashboard.types'

export function useSalesSummary(): {
  data: SalesSummaryVM | undefined
  isLoading: boolean
  isError: boolean
} {
  const bills = useBills()
  const customers = useCustomers()

  const data = useMemo<SalesSummaryVM | undefined>(() => {
    if (!bills.data || !customers.data) return undefined
    const b = bills.data
    return {
      kpis: dashboardKpis(b, customers.data),
      byDay: turnoverByDay(b),
      byMonth: turnoverByMonth(b),
      byYear: turnoverByYear(b),
      topCustomers: topCustomersByTurnover(b),
      byOrderType: turnoverByOrderType(b),
    }
  }, [bills.data, customers.data])

  return {
    data,
    isLoading: bills.isLoading || customers.isLoading,
    isError: bills.isError || customers.isError,
  }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: useSalesSummary hook`

---

## Task 10: `BillCard`

**Files:**
- Create: `src/features/bills/components/BillCard.tsx`
- Test: `src/features/bills/components/BillCard.test.tsx`

**Interfaces:**
- Consumes: `StatusBadge` (`@/shared/ui/StatusBadge`), `formatCurrency`, `bucketOf`/`BUCKET_COLOR`/`progressFromBucket` (`@/shared/constants/billStatus`), `BillListItemVM`.
- Produces:
  ```ts
  export interface BillCardProps {
    bill: BillListItemVM
    onOpen: (b: BillListItemVM) => void
    onEdit?: (b: BillListItemVM) => void
    onDelete?: (b: BillListItemVM) => void
  }
  export function BillCard(props: BillCardProps): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillCard } from '@/features/bills/components/BillCard'
import type { BillListItemVM } from '@/features/bills/bills.types'

const bill: BillListItemVM = {
  id: 'b1', billNumber: 'BILL-42', customerId: 'c1', customerName: 'Ravi Textiles',
  statusKey: 'in_progress', statusLabel: 'In progress', total: 185000, paidAmount: 95000,
  orderDate: '2026-08-12', deadline: '2026-08-28', rowsByType: { Printing: 185000 },
}

describe('BillCard', () => {
  it('renders identity, amounts and status', () => {
    render(<BillCard bill={bill} onOpen={() => {}} />)
    expect(screen.getByText('BILL-42')).toBeInTheDocument()
    expect(screen.getByText('Ravi Textiles')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('LKR 185,000.00')).toBeInTheDocument()
    expect(screen.getByText('LKR 90,000.00')).toBeInTheDocument() // pending = total - paid
  })

  it('View always shown; Edit/Delete only with handlers', async () => {
    const onOpen = vi.fn()
    const onEdit = vi.fn()
    render(<BillCard bill={bill} onOpen={onOpen} onEdit={onEdit} />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /view/i }))
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onOpen).toHaveBeenCalledWith(bill)
    expect(onEdit).toHaveBeenCalledWith(bill)
  })

  it('shows pending in success colour when fully paid', () => {
    render(<BillCard bill={{ ...bill, paidAmount: 185000 }} onOpen={() => {}} />)
    expect(screen.getByText('LKR 0.00')).toHaveClass('text-[var(--color-neo-success)]')
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- BillCard`)

- [ ] **Step 3: Implement `BillCard.tsx`**

```tsx
import { motion } from 'framer-motion'
import { FileText, Check, Eye, Pencil, Trash2, Calendar, Clock } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { bucketOf, BUCKET_COLOR, progressFromBucket } from '@/shared/constants/billStatus'
import type { BillListItemVM } from '@/features/bills/bills.types'

export interface BillCardProps {
  bill: BillListItemVM
  onOpen: (b: BillListItemVM) => void
  onEdit?: (b: BillListItemVM) => void
  onDelete?: (b: BillListItemVM) => void
}

export function BillCard({ bill, onOpen, onEdit, onDelete }: BillCardProps) {
  const bucket = bucketOf(bill.statusKey)
  const pending = bill.total - bill.paidAmount
  const progress = progressFromBucket(bill.statusKey)
  const accent = BUCKET_COLOR[bucket]
  const Icon = bucket === 'done' ? Check : FileText
  const count = 1 + (onEdit ? 1 : 0) + (onDelete ? 1 : 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]"
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)` }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--color-neo-text-primary)]">{bill.billNumber}</div>
          <div className="mt-0.5 truncate text-xs text-[var(--color-neo-text-secondary)]">{bill.customerName}</div>
        </div>
        <StatusBadge label={bill.statusLabel} color={accent} />
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--color-neo-secondary)]/15 px-4 pb-3 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Total</span>
            <span className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{formatCurrency(bill.total)}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Pending</span>
            <span className={pending > 0 ? 'text-sm font-semibold text-[var(--color-neo-danger)]' : 'text-sm font-semibold text-[var(--color-neo-success)]'}>
              {formatCurrency(pending)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-neo-text-secondary)]">
          <span className="flex items-center gap-2"><Calendar size={13} className="shrink-0" />Ord: {bill.orderDate}</span>
          <span className="flex items-center gap-2"><Clock size={13} className="shrink-0" />Due: {bill.deadline ?? '—'}</span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Work progress</span>
            <span className="text-xs font-semibold text-[var(--color-neo-text-primary)]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-neo-surface)] shadow-[var(--shadow-neo-pressed)]">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: accent }} />
          </div>
        </div>
      </div>

      <div className="grid gap-2 px-4 pb-4 pt-2" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        <button type="button" onClick={() => onOpen(bill)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95">
          <Eye size={15} />View
        </button>
        {onEdit && (
          <button type="button" onClick={() => onEdit(bill)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-warning)]/15 py-2.5 text-xs font-semibold text-[#a9750b] transition active:scale-95">
            <Pencil size={15} />Edit
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(bill)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95">
            <Trash2 size={15} />Delete
          </button>
        )}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Run — expect PASS** (`npm run test -- BillCard`). If `Check` is missing in `lucide-react@1.38`, use `CheckCheck` or `BadgeCheck`.

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: BillCard component`

---

## Task 11: `BillList` → responsive card grid

**Files:**
- Rewrite: `src/features/bills/components/BillList.tsx`
- Test: `src/features/bills/components/BillList.test.tsx` (create)

**Interfaces:**
- Consumes: `BillCard`, `BillListItemVM`.
- Produces (unchanged public shape):
  ```ts
  export function BillList(props: {
    bills: BillListItemVM[]
    onOpen: (b: BillListItemVM) => void
    onDelete: (b: BillListItemVM) => void
  }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { BillList } from '@/features/bills/components/BillList'
import type { BillListItemVM } from '@/features/bills/bills.types'

const mk = (id: string): BillListItemVM => ({
  id, billNumber: `BILL-${id}`, customerId: 'c', customerName: 'Cust',
  statusKey: 'pending', statusLabel: 'Pending', total: 1000, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {},
})

describe('BillList', () => {
  it('renders a card per bill', () => {
    render(<BillList bills={[mk('1'), mk('2')]} onOpen={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('BILL-1')).toBeInTheDocument()
    expect(screen.getByText('BILL-2')).toBeInTheDocument()
  })

  it('shows empty copy when there are none', () => {
    render(<BillList bills={[]} onOpen={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/no bills/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- BillList`)

- [ ] **Step 3: Rewrite `BillList.tsx`**

```tsx
import { BillCard } from '@/features/bills/components/BillCard'
import type { BillListItemVM } from '@/features/bills/bills.types'

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
    return <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills found.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bills.map((b) => (
        <BillCard key={b.id} bill={b} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**. Then run the existing bills suite to catch fallout: `npm run test -- bills`

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: refactor: BillList as neo card grid`

---

## Task 12: `BillsPage` — pill search + status filter chips

**Files:**
- Modify: `src/features/bills/BillsPage.tsx`
- Test: `src/features/bills/BillsPage.test.tsx` (extend, or create if absent)

**Interfaces:**
- Consumes: `BILL_FILTERS`, `matchesFilter`, `BillFilterKey` from `@/shared/constants/billStatus`; existing `useBills`, `useDeleteBill`, `BillList`, `BillFormModal`, `Modal`, `Button`.
- Produces: no new exports. Local state `filter: BillFilterKey` (default `'all'`), applied to the list alongside the existing search.

- [ ] **Step 1: Read the current page**

Run: `cat src/features/bills/BillsPage.tsx && echo --- && cat src/features/bills/BillsPage.test.tsx 2>/dev/null`

- [ ] **Step 2: Write / extend the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ bills: vi.fn(), del: vi.fn() }))
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: h.bills }))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({ useDeleteBill: () => ({ mutateAsync: h.del }) }))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: () => ({ data: [] }) }))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({ useOrderTypes: () => ({ data: [] }) }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import BillsPage from '@/features/bills/BillsPage'

const bill = (o: Record<string, unknown>) => ({
  id: 'x', billNumber: 'B', customerId: 'c', customerName: 'C',
  statusKey: 'pending', statusLabel: 'Pending', total: 1, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...o,
})

it('filters by status chip', async () => {
  h.bills.mockReturnValue({
    data: [
      bill({ id: '1', billNumber: 'OPEN-1', statusKey: 'pending' }),
      bill({ id: '2', billNumber: 'PROG-1', statusKey: 'in_progress' }),
    ],
    isLoading: false,
    isError: false,
  })
  render(<MemoryRouter><BillsPage /></MemoryRouter>)
  expect(screen.getByText('OPEN-1')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'In progress' }))
  expect(screen.queryByText('OPEN-1')).toBeNull()
  expect(screen.getByText('PROG-1')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run — expect FAIL** (`npm run test -- BillsPage`)

- [ ] **Step 4: Edit `BillsPage.tsx`**

- Add imports: `import { BILL_FILTERS, matchesFilter, type BillFilterKey } from '@/shared/constants/billStatus'`.
- Add state: `const [filter, setFilter] = useState<BillFilterKey>('all')`.
- Extend the `filtered` memo to also apply the chip:

```tsx
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter(
      (b) =>
        matchesFilter(b, filter) &&
        (q === '' ||
          b.billNumber.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q)),
    )
  }, [data, search, filter])
```

- Replace the bare `<Field ... />` search with a pill-styled input and add the chip row directly under it:

```tsx
      <div className="flex flex-col gap-4">
        <div className="relative sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-neo-text-secondary)]" />
          <input
            type="text"
            aria-label="Search bills"
            placeholder="Search bills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] pl-10 pr-4 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none placeholder:text-[var(--color-neo-text-secondary)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {BILL_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                filter === f.key
                  ? 'h-8 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-primary)] px-4 text-xs font-semibold text-white shadow-[var(--shadow-neo-soft)]'
                  : 'h-8 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-surface)] px-4 text-xs font-semibold text-[var(--color-neo-text-secondary)] shadow-[var(--shadow-neo-pressed)]'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
```

- Add `Search` to the `lucide-react` import; remove the now-unused `Field` import if nothing else uses it.

- [ ] **Step 5: Run — expect PASS**; run `npm run test -- bills` for the whole area.

- [ ] **Step 6: Typecheck + lint**

- [ ] **Step 7: Ready to commit**

`ready to commit: feat: bills search pill + status filter chips`

---

## Task 13: `CustomerCard`

**Files:**
- Create: `src/features/customers/components/CustomerCard.tsx`
- Test: `src/features/customers/components/CustomerCard.test.tsx`

**Interfaces:**
- Consumes: `CustomerVM` from `@/features/customers/customers.types`; `lucide-react` icons.
- Produces:
  ```ts
  export interface CustomerCardProps {
    customer: CustomerVM
    onEdit: (c: CustomerVM) => void
    onDelete: (c: CustomerVM) => void
  }
  export function CustomerCard(props: CustomerCardProps): JSX.Element
  ```
- Helper (module-local, not exported): `initials(name: string): string` → up to 2 uppercase letters.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerCard } from '@/features/customers/components/CustomerCard'
import type { CustomerVM } from '@/features/customers/customers.types'

const base: CustomerVM = {
  profileId: 'p1', fullName: 'Ravi Kumar', email: 'ravi@x.lk', phone: '+94 77 1',
  companyName: 'Ravi Textiles', addressLine: null, city: 'Colombo', notes: null, billCount: 3,
}

describe('CustomerCard', () => {
  it('renders name, company, contact and bill count', () => {
    render(<CustomerCard customer={base} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('Ravi Textiles')).toBeInTheDocument()
    expect(screen.getByText('ravi@x.lk')).toBeInTheDocument()
    expect(screen.getByText('Colombo')).toBeInTheDocument()
    expect(screen.getByText('3 bills')).toBeInTheDocument()
  })

  it('falls back for missing company / phone', () => {
    render(<CustomerCard customer={{ ...base, companyName: null, phone: null }} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('No company')).toBeInTheDocument()
    expect(screen.getByText('No phone')).toBeInTheDocument()
  })

  it('wires actions', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<CustomerCard customer={base} onEdit={onEdit} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onEdit).toHaveBeenCalledWith(base)
    expect(onDelete).toHaveBeenCalledWith(base)
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- CustomerCard`)

- [ ] **Step 3: Implement `CustomerCard.tsx`**

```tsx
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { CustomerVM } from '@/features/customers/customers.types'

export interface CustomerCardProps {
  customer: CustomerVM
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
  const c = customer
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]"
    >
      <div className="flex items-center gap-3 p-4">
        <span
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), #8b5cf6)' }}
        >
          {initials(c.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-[var(--color-neo-text-primary)]">{c.fullName}</div>
          {c.companyName ? (
            <div className="truncate text-xs text-[var(--color-neo-text-secondary)]">{c.companyName}</div>
          ) : (
            <div className="text-xs italic text-[var(--color-neo-text-secondary)]/70">No company</div>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-neo-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-neo-primary)] shadow-[var(--shadow-neo-pressed)]">
          {c.billCount} {c.billCount === 1 ? 'bill' : 'bills'}
        </span>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--color-neo-secondary)]/15 p-4 text-[13px] text-[var(--color-neo-text-secondary)]">
        <span className="flex items-center gap-2.5"><Mail size={15} className="shrink-0" /><span className="truncate">{c.email}</span></span>
        <span className="flex items-center gap-2.5">
          <Phone size={15} className="shrink-0" />
          {c.phone ?? <span className="italic text-[var(--color-neo-text-secondary)]/70">No phone</span>}
        </span>
        <span className="flex items-center gap-2.5">
          <MapPin size={15} className="shrink-0" />
          {c.city ?? <span className="italic text-[var(--color-neo-text-secondary)]/70">No city</span>}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
        <button type="button" onClick={() => onEdit(c)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95">
          <Pencil size={15} />Edit
        </button>
        <button type="button" onClick={() => onDelete(c)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95">
          <Trash2 size={15} />Delete
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: CustomerCard component`

---

## Task 14: `CustomerList` → grid + `CustomersPage` search styling

**Files:**
- Rewrite: `src/features/customers/components/CustomerList.tsx`
- Test: `src/features/customers/components/CustomerList.test.tsx` (create)
- Modify: `src/features/customers/CustomersPage.tsx` (search input styling only)

**Interfaces:**
- Consumes: `CustomerCard`, `CustomerVM`.
- Produces (unchanged public shape):
  ```ts
  export function CustomerList(props: {
    customers: CustomerVM[]
    onEdit: (c: CustomerVM) => void
    onDelete: (c: CustomerVM) => void
  }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { CustomerList } from '@/features/customers/components/CustomerList'
import type { CustomerVM } from '@/features/customers/customers.types'

const mk = (id: string): CustomerVM => ({
  profileId: id, fullName: `Name ${id}`, email: `${id}@x.lk`, phone: null,
  companyName: null, addressLine: null, city: null, notes: null, billCount: 0,
})

it('renders a card per customer + empty copy', () => {
  const { rerender } = render(<CustomerList customers={[mk('1'), mk('2')]} onEdit={() => {}} onDelete={() => {}} />)
  expect(screen.getByText('Name 1')).toBeInTheDocument()
  expect(screen.getByText('Name 2')).toBeInTheDocument()
  rerender(<CustomerList customers={[]} onEdit={() => {}} onDelete={() => {}} />)
  expect(screen.getByText(/no customers/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- CustomerList`)

- [ ] **Step 3: Rewrite `CustomerList.tsx`**

```tsx
import { CustomerCard } from '@/features/customers/components/CustomerCard'
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
    return <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No customers yet — add your first.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {customers.map((c) => (
        <CustomerCard key={c.profileId} customer={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Match the Bills search styling in `CustomersPage.tsx`**

Swap the bare `<Field id="customer-search" .../>` for the same pill input pattern as Task 12 (label `Search customers`, placeholder `Search customers…`), keeping the existing `search` state and `filtered` memo. Add `Search` to the `lucide-react` import; drop `Field` if unused.

- [ ] **Step 5: Run — expect PASS**; then `npm run test -- customers`

- [ ] **Step 6: Typecheck + lint**

- [ ] **Step 7: Ready to commit**

`ready to commit: refactor: CustomerList as neo card grid + matching search`

---

## Task 15: Chart & list primitives

Five thin presentational components. Recharts wrappers are covered by a render-smoke test (no geometry assertions); `HBarList` / `StatusBreakdownBar` / `RecentBillsList` get behavioural tests.

**Files:**
- Create: `src/features/dashboard/components/TurnoverBarChart.tsx` + `.test.tsx`
- Create: `src/features/dashboard/components/CollectionDonut.tsx` + `.test.tsx`
- Create: `src/features/dashboard/components/HBarList.tsx` + `.test.tsx`
- Create: `src/features/dashboard/components/StatusBreakdownBar.tsx` + `.test.tsx`
- Create: `src/features/dashboard/components/RecentBillsList.tsx` + `.test.tsx`

**Interfaces:**
- `TurnoverBarChart({ data, height }: { data: { label: string; value: number }[]; height?: number }): JSX.Element` — Recharts `ResponsiveContainer > BarChart`; bar fill `var(--color-neo-primary)`, `radius={[4, 4, 0, 0]}`, recessive `CartesianGrid`, `Tooltip` with `formatLKRShort`. Empty state (`data` all-zero or empty) → a centered `"No sales in this range"` div, no chart.
- `CollectionDonut({ collected, outstanding }: { collected: number; outstanding: number }): JSX.Element` — Recharts `PieChart` donut (`innerRadius`), `collected` = `var(--color-neo-success)`, `outstanding` = `var(--color-neo-surface)`; center label = `${pct}%`. `collected+outstanding === 0` → empty state.
- `HBarList({ items, max }: { items: { name: string; value: number }[]; max?: number }): JSX.Element` — CSS bars; each row `name` (truncate) / track+fill (`var(--color-neo-primary)`, width `value/max`) / `formatLKRShort(value)`. `max` defaults to the largest `value`. Empty → `"No data"`.
- `StatusBreakdownBar({ open, active, done, overdue }: { open: number; active: number; done: number; overdue: number }): JSX.Element` — one stacked bar (`open`→secondary, `active`→primary, `done`→success) that sums to 100%, a legend with counts, and an `overdue` line rendered separately (`⚠ N overdue` in danger) — never a 4th segment. All-zero → empty state.
- `RecentBillsList({ bills, onOpen }: { bills: BillListItemVM[]; onOpen: (b: BillListItemVM) => void }): JSX.Element` — compact rows: icon tile, `billNumber` + `customerName`, `formatLKRShort(total)`, `StatusBadge` (bucket colour+label), chevron; whole row is a button calling `onOpen`. Renders at most the array it's given (caller slices).

- [ ] **Step 1: Write the failing tests**

`TurnoverBarChart.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { TurnoverBarChart } from '@/features/dashboard/components/TurnoverBarChart'

vi.mock('recharts', async (io) => {
  const actual = await io<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
    <div style={{ width: 400, height: 200 }}>{children}</div>
  ) }
})

it('renders an svg for real data and an empty state for all-zero', () => {
  const { container, rerender } = render(
    <TurnoverBarChart data={[{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]} />,
  )
  expect(container.querySelector('svg')).not.toBeNull()
  rerender(<TurnoverBarChart data={[{ label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }]} />)
  expect(screen.getByText(/no sales/i)).toBeInTheDocument()
})
```

`CollectionDonut.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { CollectionDonut } from '@/features/dashboard/components/CollectionDonut'

vi.mock('recharts', async (io) => {
  const actual = await io<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
    <div style={{ width: 200, height: 200 }}>{children}</div>
  ) }
})

it('shows the collected percentage', () => {
  render(<CollectionDonut collected={72} outstanding={28} />)
  expect(screen.getByText('72%')).toBeInTheDocument()
})
it('empty state when nothing billed', () => {
  render(<CollectionDonut collected={0} outstanding={0} />)
  expect(screen.getByText(/no billed value/i)).toBeInTheDocument()
})
```

`HBarList.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { HBarList } from '@/features/dashboard/components/HBarList'

it('renders a row per item with a short-formatted value', () => {
  render(<HBarList items={[{ name: 'Printing', value: 2_100_000 }, { name: 'Design', value: 980_000 }]} />)
  expect(screen.getByText('Printing')).toBeInTheDocument()
  expect(screen.getByText('LKR 2.1M')).toBeInTheDocument()
  expect(screen.getByText('LKR 980k')).toBeInTheDocument()
})
```

`StatusBreakdownBar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { StatusBreakdownBar } from '@/features/dashboard/components/StatusBreakdownBar'

it('lists bucket counts and overdue separately', () => {
  render(<StatusBreakdownBar open={7} active={9} done={28} overdue={1} />)
  expect(screen.getByText('7')).toBeInTheDocument()
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('28')).toBeInTheDocument()
  expect(screen.getByText(/1 overdue/i)).toBeInTheDocument()
})
```

`RecentBillsList.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentBillsList } from '@/features/dashboard/components/RecentBillsList'
import type { BillListItemVM } from '@/features/bills/bills.types'

const b: BillListItemVM = {
  id: 'b1', billNumber: 'BILL-42', customerId: 'c', customerName: 'Ravi',
  statusKey: 'in_progress', statusLabel: 'In progress', total: 185000, paidAmount: 0,
  orderDate: '2026-08-12', deadline: null, rowsByType: {},
}

it('renders rows and calls onOpen', async () => {
  const onOpen = vi.fn()
  render(<RecentBillsList bills={[b]} onOpen={onOpen} />)
  expect(screen.getByText('BILL-42')).toBeInTheDocument()
  expect(screen.getByText('LKR 185k')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /BILL-42/ }))
  expect(onOpen).toHaveBeenCalledWith(b)
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- dashboard/components`)

- [ ] **Step 3: Implement `TurnoverBarChart.tsx`**

```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'

export function TurnoverBarChart({
  data,
  height = 260,
}: {
  data: { label: string; value: number }[]
  height?: number
}) {
  const empty = data.length === 0 || data.every((d) => d.value === 0)
  if (empty) {
    return (
      <div className="flex items-center justify-center text-sm text-[var(--color-neo-text-secondary)]" style={{ height }}>
        No sales in this range
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-neo-secondary)" strokeOpacity={0.18} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-neo-text-secondary)' }} />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--color-neo-text-secondary)' }}
          tickFormatter={(v: number) => formatLKRShort(v).replace('LKR ', '')}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-neo-secondary)', fillOpacity: 0.1 }}
          formatter={(v: number) => [formatLKRShort(v), 'Turnover']}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-neo-floating)' }}
        />
        <Bar dataKey="value" fill="var(--color-neo-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Implement `CollectionDonut.tsx`**

```tsx
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function CollectionDonut({ collected, outstanding }: { collected: number; outstanding: number }) {
  const total = collected + outstanding
  if (total === 0) {
    return <div className="flex h-[160px] items-center justify-center text-sm text-[var(--color-neo-text-secondary)]">No billed value yet</div>
  }
  const pct = Math.round((collected / total) * 100)
  const data = [
    { name: 'Collected', value: collected },
    { name: 'Outstanding', value: outstanding },
  ]
  return (
    <div className="relative h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={52} outerRadius={70} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill="var(--color-neo-success)" />
            <Cell fill="var(--color-neo-surface)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-extrabold text-[var(--color-neo-text-primary)]">{pct}%</span>
        <span className="text-[10px] text-[var(--color-neo-text-secondary)]">collected</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement `HBarList.tsx`**

```tsx
import { formatLKRShort } from '@/shared/utils/formatLKRShort'

export function HBarList({ items, max }: { items: { name: string; value: number }[]; max?: number }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-neo-text-secondary)]">No data</p>
  }
  const top = max ?? Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <div key={i.name} className="grid grid-cols-[132px_1fr_78px] items-center gap-3">
          <span className="truncate text-xs font-semibold text-[var(--color-neo-text-primary)]">{i.name}</span>
          <span className="h-3 overflow-hidden rounded-full bg-[var(--color-neo-surface)] shadow-[var(--shadow-neo-pressed)]">
            <span className="block h-full rounded-full bg-[var(--color-neo-primary)]" style={{ width: `${(i.value / top) * 100}%` }} />
          </span>
          <span className="text-right text-xs font-bold text-[var(--color-neo-text-primary)]">{formatLKRShort(i.value)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement `StatusBreakdownBar.tsx`**

```tsx
import { AlertTriangle } from 'lucide-react'

const SEGMENTS = [
  { key: 'open', label: 'Pending', color: 'var(--color-neo-secondary)' },
  { key: 'active', label: 'In progress', color: 'var(--color-neo-primary)' },
  { key: 'done', label: 'Completed', color: 'var(--color-neo-success)' },
] as const

export function StatusBreakdownBar({
  open,
  active,
  done,
  overdue,
}: {
  open: number
  active: number
  done: number
  overdue: number
}) {
  const counts = { open, active, done }
  const total = open + active + done
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills yet</p>
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 overflow-hidden rounded-full shadow-[var(--shadow-neo-pressed)]">
        {SEGMENTS.map((s) => (
          <span key={s.key} style={{ width: `${(counts[s.key] / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[var(--color-neo-text-secondary)]">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-bold text-[var(--color-neo-text-primary)]">{counts[s.key]}</span>
          </div>
        ))}
      </div>
      {overdue > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-neo-danger)]">
          <AlertTriangle size={13} />
          {overdue} overdue
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Implement `RecentBillsList.tsx`**

```tsx
import { FileText, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { bucketOf, BUCKET_COLOR } from '@/shared/constants/billStatus'
import type { BillListItemVM } from '@/features/bills/bills.types'

export function RecentBillsList({
  bills,
  onOpen,
}: {
  bills: BillListItemVM[]
  onOpen: (b: BillListItemVM) => void
}) {
  if (bills.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills yet</p>
  }
  return (
    <div className="flex flex-col">
      {bills.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onOpen(b)}
          className="flex items-center gap-3.5 border-b border-[var(--color-neo-secondary)]/12 py-3 text-left last:border-0"
        >
          <span
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-white"
            style={{ background: `linear-gradient(135deg, ${BUCKET_COLOR[bucketOf(b.statusKey)]}, #8b5cf6)` }}
          >
            <FileText size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[var(--color-neo-text-primary)]">{b.billNumber}</span>
            <span className="block truncate text-[11px] text-[var(--color-neo-text-secondary)]">{b.customerName}</span>
          </span>
          <span className="text-[13px] font-semibold text-[var(--color-neo-text-primary)]">{formatLKRShort(b.total)}</span>
          <StatusBadge label={b.statusLabel} color={BUCKET_COLOR[bucketOf(b.statusKey)]} />
          <ChevronRight size={16} className="text-[var(--color-neo-text-secondary)]/60" />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Run — expect PASS** (`npm run test -- dashboard/components`). Swap any missing icon (`AlertTriangle`, `ChevronRight`) for the nearest existing one.

- [ ] **Step 9: Typecheck + lint**

- [ ] **Step 10: Ready to commit**

`ready to commit: feat: dashboard chart + list primitives`

---

## Task 16: `DashboardPage` — real overview

**Files:**
- Rewrite: `src/features/dashboard/DashboardPage.tsx` (currently `<PlaceholderPage title="Dashboard" />`)
- Test: `src/features/dashboard/DashboardPage.test.tsx` (create)

**Interfaces:**
- Consumes: `useSalesSummary`; `useBills` (for the recent list + status counts source — reuse `useSalesSummary`'s bills via a second `useBills()` call is wasteful, so: add `recentBills: BillListItemVM[]` (newest 5) and `overdueCount: number` to `SalesSummaryVM`? **No** — keep `SalesSummaryVM` as specced. Instead `DashboardPage` calls `useBills()` directly for the recent list + overdue count, and `useSalesSummary()` for KPIs/chart.) ; `StatCard`, `SegmentedControl`, `TurnoverBarChart`, `StatusBreakdownBar`, `RecentBillsList`, `Button`; `formatLKRShort`; `bucketOf`, `isOverdue`; `useNavigate`, `Link` from `react-router-dom`; `ROUTES`.
- Produces: default-exported `DashboardPage` component. No new shared exports.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ summary: vi.fn(), bills: vi.fn() }))
vi.mock('@/features/dashboard/queries/useSalesSummary', () => ({ useSalesSummary: h.summary }))
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: h.bills }))
vi.mock('@/features/dashboard/components/TurnoverBarChart', () => ({
  TurnoverBarChart: ({ data }: { data: unknown[] }) => <div data-testid="chart" data-len={data.length} />,
}))

import DashboardPage from '@/features/dashboard/DashboardPage'

const kpis = {
  outstandingTotal: 412000, outstandingCount: 7, inProgressCount: 9, completedCount: 28,
  customerCount: 34, thisMonthTurnover: 940000, lastMonthTurnover: 880000, momChangePct: 7,
  ytdTurnover: 5240000, avgBillValue: 78400, collectionRate: 0.72, collectedTotal: 5680000,
}
const summary = {
  kpis,
  byDay: [{ date: '2026-09-01', turnover: 1 }, { date: '2026-09-02', turnover: 2 }],
  byMonth: [{ month: '2026-08', turnover: 1 }, { month: '2026-09', turnover: 2 }],
  byYear: [{ year: 2025, turnover: 1, ytd: false }, { year: 2026, turnover: 2, ytd: true }],
  topCustomers: [], byOrderType: [],
}

beforeEach(() => {
  h.summary.mockReturnValue({ data: summary, isLoading: false, isError: false })
  h.bills.mockReturnValue({ data: [], isLoading: false, isError: false })
})

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>)

it('shows KPI values', () => {
  renderPage()
  expect(screen.getByText('LKR 412k')).toBeInTheDocument()
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('28')).toBeInTheDocument()
  expect(screen.getByText('34')).toBeInTheDocument()
})

it('segmented control switches the chart dataset', async () => {
  renderPage()
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '2') // monthly default (2 pts)
  await userEvent.click(screen.getByRole('radio', { name: 'Daily' }))
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '2') // byDay also 2 pts here
})

it('renders loading + error states', () => {
  h.summary.mockReturnValue({ data: undefined, isLoading: true, isError: false })
  renderPage()
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  h.summary.mockReturnValue({ data: undefined, isLoading: false, isError: true })
  renderPage()
  expect(screen.getByText(/could not load/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- DashboardPage`)

- [ ] **Step 3: Implement `DashboardPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Loader, CheckCircle, Users, Plus, ChevronRight } from 'lucide-react'
import { ROUTES } from '@/shared/constants/routes'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatCard } from '@/shared/ui/StatCard'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { bucketOf, isOverdue } from '@/shared/constants/billStatus'
import { useBills } from '@/features/bills/queries/useBills'
import { useSalesSummary } from '@/features/dashboard/queries/useSalesSummary'
import { TurnoverBarChart } from '@/features/dashboard/components/TurnoverBarChart'
import { StatusBreakdownBar } from '@/features/dashboard/components/StatusBreakdownBar'
import { RecentBillsList } from '@/features/dashboard/components/RecentBillsList'

type Grain = 'day' | 'month' | 'year'

export default function DashboardPage() {
  const { data, isLoading, isError } = useSalesSummary()
  const bills = useBills()
  const [grain, setGrain] = useState<Grain>('month')
  const navigate = useNavigate()

  const recent = useMemo(
    () => [...(bills.data ?? [])].sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1)).slice(0, 5),
    [bills.data],
  )
  const overdueCount = useMemo(() => (bills.data ?? []).filter((b) => isOverdue(b)).length, [bills.data])
  const openCount = useMemo(
    () => (bills.data ?? []).filter((b) => bucketOf(b.statusKey) === 'open').length,
    [bills.data],
  )

  if (isLoading) return <p className="p-6 text-sm text-[var(--color-neo-text-secondary)] md:p-8">Loading…</p>
  if (isError || !data)
    return <p className="p-6 text-sm text-[var(--color-neo-danger)] md:p-8">Could not load the dashboard.</p>

  const k = data.kpis
  const chartData =
    grain === 'day'
      ? data.byDay.map((d) => ({ label: d.date.slice(5), value: d.turnover }))
      : grain === 'year'
        ? data.byYear.map((d) => ({ label: String(d.year), value: d.turnover }))
        : data.byMonth.map((d) => ({ label: d.month.slice(5), value: d.turnover }))

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Where things stand today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Outstanding" value={formatLKRShort(k.outstandingTotal)} icon={CreditCard} tone="danger" sub={`across ${k.outstandingCount} unpaid`} />
        <StatCard label="In progress" value={String(k.inProgressCount)} icon={Loader} tone="primary" sub="bills being worked on" />
        <StatCard label="Completed" value={String(k.completedCount)} icon={CheckCircle} tone="success" sub="delivered" />
        <StatCard label="Customers" value={String(k.customerCount)} icon={Users} tone="neutral" />
      </div>

      <Card className="p-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-neo-text-primary)]">Monthly turnover</h2>
            <p className="text-[11px] text-[var(--color-neo-text-secondary)]">Billed value by order date</p>
          </div>
          <div className="flex items-center gap-3">
            <SegmentedControl
              ariaLabel="Turnover range"
              value={grain}
              onChange={setGrain}
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' },
              ]}
            />
            <Link to={ROUTES.sales} className="flex items-center gap-1 text-xs font-semibold text-[var(--color-neo-primary)]">
              Sales detail <ChevronRight size={14} />
            </Link>
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[22px] font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">
            {formatLKRShort(k.thisMonthTurnover)}
          </span>
          <span className={k.momChangePct >= 0 ? 'text-xs font-bold text-[var(--color-neo-success)]' : 'text-xs font-bold text-[var(--color-neo-danger)]'}>
            {k.momChangePct >= 0 ? '+' : ''}
            {Math.round(k.momChangePct)}% MoM
          </span>
        </div>
        <div className="mt-2">
          <TurnoverBarChart data={chartData} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[var(--color-neo-text-primary)]">Recent bills</h2>
            <Link to={ROUTES.bills} className="text-xs font-semibold text-[var(--color-neo-primary)]">View all</Link>
          </div>
          <RecentBillsList bills={recent} onOpen={(b) => navigate(`/bills/${b.id}`)} />
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Bills by status</h2>
            <StatusBreakdownBar open={openCount} active={k.inProgressCount} done={k.completedCount} overdue={overdueCount} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Quick actions</h2>
            <div className="flex flex-col gap-2.5">
              <Button variant="inset" fullWidth icon={<Plus size={16} />} onClick={() => navigate(ROUTES.bills)}>New bill</Button>
              <Button variant="inset" fullWidth icon={<Users size={16} />} onClick={() => navigate(ROUTES.customers)}>Add customer</Button>
              <Button variant="ghost" fullWidth onClick={() => navigate(ROUTES.settings)}>Settings</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS** (`npm run test -- DashboardPage`). Adjust the test's `data-len` expectations if you change which grain is default. Swap missing icons (`Loader`, `CheckCircle`, `CreditCard`) for existing ones.

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: real Dashboard overview`

---

## Task 17: `SalesPage` + swap the placeholder route

**Files:**
- Create: `src/features/dashboard/SalesPage.tsx`
- Test: `src/features/dashboard/SalesPage.test.tsx`
- Modify: `src/app/router/AppRouter.tsx` (swap placeholder → `SalesPage`)

**Interfaces:**
- Consumes: `useSalesSummary`; `StatCard`, `SegmentedControl`, `TurnoverBarChart`, `CollectionDonut`, `HBarList`, `Card`; `formatLKRShort`.
- Produces: default-exported `SalesPage`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ summary: vi.fn() }))
vi.mock('@/features/dashboard/queries/useSalesSummary', () => ({ useSalesSummary: h.summary }))
vi.mock('@/features/dashboard/components/TurnoverBarChart', () => ({
  TurnoverBarChart: ({ data }: { data: unknown[] }) => <div data-testid="chart" data-len={data.length} />,
}))
vi.mock('@/features/dashboard/components/CollectionDonut', () => ({
  CollectionDonut: ({ collected }: { collected: number }) => <div data-testid="donut">{collected}</div>,
}))

import SalesPage from '@/features/dashboard/SalesPage'

const summary = {
  kpis: {
    outstandingTotal: 412000, outstandingCount: 7, inProgressCount: 9, completedCount: 28,
    customerCount: 34, thisMonthTurnover: 940000, lastMonthTurnover: 880000, momChangePct: 7,
    ytdTurnover: 5240000, avgBillValue: 78400, collectionRate: 0.72, collectedTotal: 5680000,
  },
  byDay: [{ date: '2026-09-01', turnover: 1 }, { date: '2026-09-02', turnover: 2 }, { date: '2026-09-03', turnover: 3 }],
  byMonth: [{ month: '2026-08', turnover: 1 }, { month: '2026-09', turnover: 2 }],
  byYear: [{ year: 2026, turnover: 2, ytd: true }],
  topCustomers: [{ name: 'Ravi', turnover: 1280000 }],
  byOrderType: [{ name: 'Printing', turnover: 2100000 }],
}

it('renders summary tiles, the toggled chart and breakdowns', async () => {
  h.summary.mockReturnValue({ data: summary, isLoading: false, isError: false })
  render(<SalesPage />)
  expect(screen.getByText('LKR 940k')).toBeInTheDocument()          // this-month tile
  expect(screen.getByText('72%')).toBeInTheDocument()               // collection tile
  expect(screen.getByText('Ravi')).toBeInTheDocument()              // top customers
  expect(screen.getByText('Printing')).toBeInTheDocument()          // by order type
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '2') // monthly default
  await userEvent.click(screen.getByRole('radio', { name: 'Daily' }))
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '3')
})

it('loading + error', () => {
  h.summary.mockReturnValue({ data: undefined, isLoading: true, isError: false })
  const { rerender } = render(<SalesPage />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  h.summary.mockReturnValue({ data: undefined, isLoading: false, isError: true })
  rerender(<SalesPage />)
  expect(screen.getByText(/could not load/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- SalesPage`)

- [ ] **Step 3: Implement `SalesPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Calendar, Wallet, TrendingUp, Receipt, PieChart as PieIcon } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { StatCard } from '@/shared/ui/StatCard'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { useSalesSummary } from '@/features/dashboard/queries/useSalesSummary'
import { TurnoverBarChart } from '@/features/dashboard/components/TurnoverBarChart'
import { CollectionDonut } from '@/features/dashboard/components/CollectionDonut'
import { HBarList } from '@/features/dashboard/components/HBarList'

type Grain = 'day' | 'month' | 'year'

export default function SalesPage() {
  const { data, isLoading, isError } = useSalesSummary()
  const [grain, setGrain] = useState<Grain>('month')

  const chartData = useMemo(() => {
    if (!data) return []
    if (grain === 'day') return data.byDay.map((d) => ({ label: d.date.slice(5), value: d.turnover }))
    if (grain === 'year') return data.byYear.map((d) => ({ label: String(d.year), value: d.turnover }))
    return data.byMonth.map((d) => ({ label: d.month.slice(5), value: d.turnover }))
  }, [data, grain])

  if (isLoading) return <p className="p-6 text-sm text-[var(--color-neo-text-secondary)] md:p-8">Loading…</p>
  if (isError || !data)
    return <p className="p-6 text-sm text-[var(--color-neo-danger)] md:p-8">Could not load sales.</p>

  const k = data.kpis
  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Sales &amp; turnover</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">Billed value across every order — daily, monthly and yearly.</p>
        </div>
        <span className="flex items-center gap-2 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--color-neo-text-secondary)] shadow-[var(--shadow-neo-pressed)]">
          <Calendar size={14} />
          Last 12 months
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="This month turnover" value={formatLKRShort(k.thisMonthTurnover)} icon={TrendingUp} deltaPct={k.momChangePct} spark={data.byMonth.map((d) => d.turnover)} sub={`vs ${formatLKRShort(k.lastMonthTurnover)} last month`} />
        <StatCard label="Turnover YTD" value={formatLKRShort(k.ytdTurnover)} icon={Wallet} spark={data.byMonth.map((d) => d.turnover)} />
        <StatCard label="Avg bill value" value={formatLKRShort(k.avgBillValue)} icon={Receipt} />
        <StatCard label="Collection rate" value={`${Math.round(k.collectionRate * 100)}%`} icon={PieIcon} tone="success" sub={`${formatLKRShort(k.outstandingTotal)} outstanding`} />
      </div>

      <Card className="p-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-neo-text-primary)]">Turnover</h2>
            <p className="text-[11px] text-[var(--color-neo-text-secondary)]">Billed value by order date</p>
          </div>
          <SegmentedControl
            ariaLabel="Turnover range"
            value={grain}
            onChange={setGrain}
            options={[
              { value: 'day', label: 'Daily' },
              { value: 'month', label: 'Monthly' },
              { value: 'year', label: 'Yearly' },
            ]}
          />
        </div>
        <div className="mt-3">
          <TurnoverBarChart data={chartData} height={300} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr_1fr]">
        <Card className="p-[22px]">
          <h2 className="mb-1 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Collection rate</h2>
          <p className="text-[11px] text-[var(--color-neo-text-secondary)]">Paid vs billed</p>
          <div className="mt-3">
            <CollectionDonut collected={k.collectedTotal} outstanding={k.outstandingTotal} />
          </div>
        </Card>
        <Card className="p-[22px]">
          <h2 className="mb-4 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Top customers by turnover</h2>
          <HBarList items={data.topCustomers.map((c) => ({ name: c.name, value: c.turnover }))} />
        </Card>
        <Card className="p-[22px]">
          <h2 className="mb-4 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Turnover by order type</h2>
          <HBarList items={data.byOrderType.map((c) => ({ name: c.name, value: c.turnover }))} />
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Swap the route** in `AppRouter.tsx`

Add `import SalesPage from '@/features/dashboard/SalesPage'`, remove the `PlaceholderPage` import if now unused, and change the `/sales` route element to `<SalesPage />`.

- [ ] **Step 5: Run — expect PASS** (`npm run test -- SalesPage`), then `npm run test` (full suite).

- [ ] **Step 6: Typecheck + lint**

- [ ] **Step 7: Ready to commit**

`ready to commit: feat: SalesPage turnover screen at /sales`

---

## Task 18: Glass floating-pill `MobileBottomBar` + layout padding

**Files:**
- Rewrite: `src/components/navigation/MobileBottomBar.tsx`
- Modify: `src/layouts/AppLayout.tsx`
- Test: `src/components/navigation/MobileBottomBar.test.tsx` (create)

**Interfaces:**
- Consumes: `STAFF_NAV` (the 4 mobile tabs — unchanged), `NavLink` from `react-router-dom`, `cn`.
- Produces: no new exports. The bar is a detached, rounded, translucent-blur pill; the active tab is a nested capsule.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar'
import { STAFF_NAV } from '@/components/navigation/navConfig'

it('renders exactly the 4 staff tabs with the current route active', () => {
  render(
    <MemoryRouter initialEntries={['/bills']}>
      <MobileBottomBar />
    </MemoryRouter>,
  )
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(STAFF_NAV.length)
  expect(links).toHaveLength(4)
  expect(screen.getByRole('link', { name: /bills/i })).toHaveAttribute('aria-current', 'page')
})
```

(`NavLink` sets `aria-current="page"` on the active link by default — assert that rather than a class.)

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- MobileBottomBar`)

- [ ] **Step 3: Rewrite `MobileBottomBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { STAFF_NAV } from '@/components/navigation/navConfig'

export function MobileBottomBar() {
  return (
    <nav
      className={cn(
        'fixed inset-x-3 z-40 flex h-16 items-center gap-1 rounded-[var(--radius-neo-pill)] px-2 md:hidden',
        'border border-white/60 bg-[var(--color-neo-card)]/60',
        'shadow-[0_10px_34px_rgba(43,45,66,0.18)] backdrop-blur-[22px] backdrop-saturate-[1.85]',
        '[bottom:calc(16px+env(safe-area-inset-bottom,0px))]',
      )}
      style={{ boxShadow: '0 10px 34px rgba(43,45,66,0.18), inset 0 1px 0 rgba(255,255,255,0.85)' }}
    >
      {STAFF_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-1.5 text-[10px] font-semibold transition-colors',
              isActive
                ? 'bg-[var(--color-neo-primary)]/16 text-[var(--color-neo-primary)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.6)]'
                : 'text-[var(--color-neo-text-secondary)]',
            )
          }
        >
          <item.icon size={20} />
          {item.shortLabel}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Update `AppLayout.tsx` bottom padding**

Change the inner wrapper's `pb-[calc(54px+env(safe-area-inset-bottom,0px))]` to `pb-[calc(88px+env(safe-area-inset-bottom,0px))]` (keeps `md:pb-0`). No other change.

- [ ] **Step 5: Run — expect PASS** (`npm run test -- MobileBottomBar`)

- [ ] **Step 6: Full suite + typecheck + lint**

Run: `npm run test && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 7: Ready to commit**

`ready to commit: feat: iOS-26 glass floating-pill mobile nav`

---

## Self-Review (completed during planning)

**1. Spec coverage**

| Spec §2 item | Task |
|---|---|
| recharts dep | 1 |
| `features/dashboard/` selector layer | 7, 8, 9 |
| `DashboardPage` real build | 16 |
| `SalesPage` `/sales` | 5 (route), 17 (page) |
| `BillCard` | 10 |
| `BillList` grid | 11 |
| `BillsPage` search + chips | 12 |
| `CustomerCard` | 13 |
| `CustomerList` grid | 14 |
| `MobileBottomBar` glass Option A | 18 |
| `SegmentedControl`, `StatCard`, `Sparkline` | 3, 4 |
| routes / navConfig / Sidebar / AppRouter | 5, 17 |
| `BillListItemVM.rowsByType` | 6 |
| `shared/constants/billStatus.ts` | 2 |
| Tests | every task |
| §5 interim: status→bucket | 2 |
| §5 interim: coarse progress | 2 (`progressFromBucket`), consumed in 10 |
| §5 interim: `turnoverByOrderType` via `rowsByType` | 6, 8 |
| §5 interim: no sample numbers in code | 15 (empty states), 16/17 (live data only) |
| §5 interim: Sales desktop-only | 5 |

**2. Placeholder scan** — no `TBD`/`TODO`/"add error handling"/"similar to Task N". The one literal `// TODO` (real stage progress) is a deliberate, spec-sanctioned code marker in Task 10's call site, with the interim behaviour fully specified.

**3. Type consistency** — `SalesSummaryVM` / `DashboardKpisVM` field names are used identically in Tasks 7–9, 16, 17. `BillCardProps` / `CustomerCardProps` match their consumers. `SegmentedControl<T>` generic signature is stable across Tasks 3, 16, 17. `bucketOf` / `isOverdue` / `matchesFilter` / `progressFromBucket` signatures fixed in Task 2 and consumed unchanged.

**Note for the executor:** Task 16 deliberately calls `useBills()` a second time (alongside `useSalesSummary()`) for the recent-bills list and overdue/open counts — this is intentional, not a redundancy to "fix"; TanStack Query dedupes the `['bills']` key so there is no extra request.

