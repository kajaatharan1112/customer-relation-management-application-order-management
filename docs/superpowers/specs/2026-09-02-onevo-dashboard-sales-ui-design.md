# ONEVO — Dashboard, Sales & UI Refresh Design Spec

**Document type:** Design specification
**Date:** 2026-09-02
**Status:** Draft — awaiting review
**Depends on:** Phases 1–4 (schema, RLS, auth, app shell, settings, customers, bills, tracking) — all complete and verified.

---

## 1. Context

Every staff screen exists, but three of them are thin:

- **`/` Dashboard** is `<PlaceholderPage title="Dashboard" />` — no content.
- **Bills** and **Customers** list as flat `Card` rows (billNumber + one line + two ghost buttons).
- **Mobile bottom bar** is an edge-to-edge `#EDF2F8` block with a top border.

A design canvas ([ONEVO Redesign](https://claude.ai/code/artifact/b585c839-ada3-410c-a92f-a18ca49acbb4)) settled the visual target: neumorphic **Bill / Customer cards**, a compact **Dashboard overview**, a dedicated **Sales & turnover** screen (daily / monthly / yearly), and an **iOS-26 "floating pill" glass** mobile nav. Tokens are unchanged from `src/index.css` (`#E9EEF5` bg, `#5A7BFF` primary, Inter, neo soft/pressed/floating shadows, 15–16px radii). This spec implements that canvas. **Turnover is the analytical focus.**

### What already exists

- `features/bills/` — `billRepository.list()` → `BillListItemVM[]` (`id`, `billNumber`, `customerName`, `statusKey`/`statusLabel`, `total`, `paidAmount`, `orderDate`, `deadline`). The list `SELECT` already embeds `bill_rows(id, detail, order_type_id, amount, order_types(name))` but the list VM drops the rows.
- `features/customers/` — `customerRepository.list()` → `CustomerVM[]` (`profileId`, `fullName`, `email`, `phone`, `companyName`, `addressLine`, `city`, `notes`, `billCount`).
- `useBills()` (`['bills']`), `useCustomers()` (`['customers']`) — TanStack Query, no pagination (return all non-deleted rows).
- `shared/ui/` — `Card` (soft/inset/floating), `Button` (default/primary/danger/ghost/inset), `StatusBadge` (`label` + `color`), `Modal`, `Field`, `Toast`, `PlaceholderPage`.
- `shared/utils/` — `formatCurrency(amount, {code='LKR', locale='en-LK'})`, `cn`, `formatBytes`, `relativeTime`.
- `components/navigation/` — `Sidebar` (72px dark rail), `TopBar` (64px dark), `MobileBottomBar`, `navConfig.tsx` (`STAFF_NAV`).
- `layouts/AppLayout.tsx` — rail + topbar + `<main>` with `pb-[calc(54px+env(safe-area-inset-bottom,0px))] md:pb-0`.
- `AppRouter.tsx` — staff routes under `RoleRoute allow="staff"` + `AppLayout`.
- `features/tracking/` — `useWorkflowTemplates()` (`stages` per template); `bill_rows.current_stage_id`. **Not consumed by this spec** (see §5, progress mapping).
- Convention: `features/<name>/{data,queries,mutations,components}`, camelCase VMs, Supabase only in repositories, colocated `*.test.tsx`, `vi.hoisted` hook mocks, **no git** (`ready to commit:` per task).

---

## 2. Scope

### In scope

1. **`recharts`** added as a dependency; used for the bar / area / donut charts.
2. **`features/dashboard/` module** — a selector layer (no repository):
   - `dashboard.selectors.ts` — pure aggregation functions over `BillListItemVM[]` / `CustomerVM[]`.
   - `queries/useSalesSummary.ts` — composes `useBills()` + `useCustomers()` + `useMemo(selectors)`.
   - `dashboard.types.ts` — the aggregate VM shapes.
3. **`DashboardPage` (`/`)** — real build: 4 KPI `StatCard`s (Outstanding, In progress, Completed, Customers), a **Monthly turnover** `TurnoverBarChart` with a `SegmentedControl` (Daily / Monthly / Yearly, working — switches the chart's dataset; Monthly default), a Recent-bills list (compact rows, newest 5), a `StatusBreakdownBar` (stacked `open` / `active` / `done` summing to 100% + legend counts; overdue shown as a separate figure, not a 4th segment), a Quick-actions card (New bill / Add customer / Settings). A "Sales detail →" link to `/sales`.
4. **`SalesPage` (`/sales`)** — new staff route. Header with a static date-range chip; 4 summary tiles with `Sparkline`s (This-month turnover, Turnover YTD, Avg bill value, Collection rate); one **main turnover** `TurnoverBarChart` whose granularity is a `SegmentedControl` — **Daily** (14 d) / **Monthly** (12 mo, default, peak direct-labelled) / **Yearly** (current year marked `ytd`); **Collection rate** donut (`PieChart`); **Top customers by turnover** (`HBarList`); **Turnover by order type** (`HBarList`). Per-chart empty states. (The canvas's separate daily/yearly cards are folded into the one toggled chart — no redundant charts.)
5. **`BillCard`** — new; the neo card from the canvas: gradient icon tile, `StatusBadge` with dot, 2×2 pressed-inset Total / Pending tiles (`formatCurrency`), order/due dates, a work-progress bar, a tinted View / Edit / Delete footer (Edit/Delete only when the handler is passed). Props: `bill: BillListItemVM`, `onOpen`, `onEdit?`, `onDelete?`.
6. **`BillList`** — flat rows → responsive card grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), same props.
7. **`BillsPage`** — pill-styled search; a status **filter chip** row (All / Pending / In progress / Completed / Overdue) as local state feeding `BillList`. Create/delete modals unchanged.
8. **`CustomerCard`** — new; neo card: avatar initials tile, name, company (`"No company"` italic fallback), email / phone / city rows with icons, a `billCount` chip, Edit / Delete footer. Props: `customer: CustomerVM`, `onEdit`, `onDelete`.
9. **`CustomerList`** — rows → card grid, same props.
10. **`MobileBottomBar`** — rewrite to glass **Option A (floating pill)**: `fixed`, `left/right: 12px`, `bottom: calc(16px + env(safe-area-inset-bottom))`, `rounded-full`, `backdrop-blur-[22px]` + `saturate(1.85)`, translucent `#EDF2F8`/60, `1px` top highlight ring, floating shadow; active tab = nested capsule (`#5A7BFF`/16, `rounded-[18px]`). 4 tabs (Home / Customers / Bills / Settings). `AppLayout` bottom padding `54px` → `88px`.
11. **Shared UI** — `SegmentedControl`, `StatCard`, `Sparkline` (inline-SVG polyline).
12. **Wiring** — `routes.ts` `sales: '/sales'`; `AppRouter` staff `<Route>`; `navConfig` + `Sidebar` gain a **Sales** item (desktop rail only).
13. **`BillListItemVM.rowsByType: Record<string, number>`** — mapper addition in `bill.repository.ts` (data already in the `SELECT`); needed by `turnoverByOrderType`.
14. **`shared/constants/billStatus.ts`** — `STATUS_META` keyed by `statusKey` → `{ bucket: 'open' | 'active' | 'done', label }`, with `isOverdue(bill)`.
15. **Tests** — colocated, per §6.

### Out of scope

- Any Supabase migration / view / RPC. All aggregation is client-side over the existing queries.
- The **customer portal** (`/portal*`) — unchanged. No portal dashboard.
- Real per-row **stage progress** on `BillCard` (interim mapping — §5).
- `TopBar` / `Sidebar` visual redesign beyond adding the Sales item.
- Date-range **picking** on `/sales` (the chip is static display; `SegmentedControl` granularity is the only working control).
- Dark mode, CSV/PDF export, drill-down from charts.
- Sales in the **mobile** bottom bar (desktop rail + the dashboard link only).

---

## 3. Architecture

```
src/
├── shared/
│   ├── constants/billStatus.ts                 (new)  STATUS_META, bucketOf, isOverdue
│   └── ui/
│       ├── SegmentedControl.tsx (+ .test.tsx)   (new)  neo pill group
│       ├── StatCard.tsx (+ .test.tsx)           (new)  KPI tile
│       └── Sparkline.tsx                        (new)  inline-SVG polyline
├── features/
│   ├── dashboard/
│   │   ├── dashboard.types.ts                   (new)
│   │   ├── dashboard.selectors.ts (+ .test.ts)  (new)  pure aggregation
│   │   ├── queries/useSalesSummary.ts           (new)
│   │   ├── DashboardPage.tsx (+ .test.tsx)      (replace PlaceholderPage)
│   │   ├── SalesPage.tsx (+ .test.tsx)          (new)
│   │   └── components/
│   │       ├── TurnoverBarChart.tsx             (new)  recharts BarChart wrapper
│   │       ├── CollectionDonut.tsx              (new)  recharts PieChart wrapper
│   │       ├── HBarList.tsx                      (new)  CSS horizontal-bar list
│   │       ├── StatusBreakdownBar.tsx           (new)  stacked bar + legend
│   │       └── RecentBillsList.tsx              (new)  compact bill rows
│   ├── bills/
│   │   ├── bills.types.ts                       (edit) + rowsByType
│   │   ├── data/bill.repository.ts (+ .test.ts) (edit) map rowsByType
│   │   ├── components/BillCard.tsx (+ .test.tsx)(new)
│   │   ├── components/BillList.tsx (+ .test.tsx)(rewrite → grid)
│   │   └── BillsPage.tsx (+ .test.tsx)          (edit) search + chips
│   └── customers/
│       ├── components/CustomerCard.tsx (+ .test.tsx) (new)
│       ├── components/CustomerList.tsx (+ .test.tsx) (rewrite → grid)
│       └── CustomersPage.tsx                    (edit) search styling only
├── components/navigation/
│   ├── MobileBottomBar.tsx (+ .test.tsx)        (rewrite → glass pill)
│   ├── Sidebar.tsx                              (edit) + Sales item
│   └── navConfig.tsx                            (edit) + Sales NavItem
├── layouts/AppLayout.tsx                        (edit) bottom padding
├── app/router/AppRouter.tsx                     (edit) + /sales route
├── shared/constants/routes.ts                   (edit) + sales
└── vitest.setup.ts                              (edit) + ResizeObserver polyfill
```

**Data flow:** `useBills()` / `useCustomers()` (unchanged) → `useSalesSummary()` calls the pure selectors inside `useMemo` keyed on the two query results → `DashboardPage` / `SalesPage` read the aggregate VM. Charts receive plain arrays; no chart component touches a query.

**Isolation:** every selector is a pure `(bills, customers?) => VM` function, unit-tested without React. Chart components are presentational (`data` + `height` props). `BillCard` / `CustomerCard` take a VM + callbacks and know nothing about queries or routing.

---

## 4. Data layer — `dashboard.selectors.ts`

All functions are pure and synchronous. `bills: BillListItemVM[]`.

| Function | Returns | Notes |
|---|---|---|
| `turnoverByDay(bills, days = 14)` | `{ date: string; turnover: number }[]` | `date` is ISO `YYYY-MM-DD`; buckets `total` by `orderDate` (local date), last `days` incl. today, zero-filled; chart formats the label |
| `turnoverByMonth(bills, months = 12)` | `{ month: string; turnover: number }[]` | `YYYY-MM`; zero-filled |
| `turnoverByYear(bills)` | `{ year: number; turnover: number; ytd: boolean }[]` | earliest `orderDate` year → current; current year `ytd: true` |
| `dashboardKpis(bills, customers)` | `DashboardKpisVM` | see below |
| `topCustomersByTurnover(bills, n = 5)` | `{ name: string; turnover: number }[]` | grouped by `customerName`, desc, top `n` |
| `turnoverByOrderType(bills)` | `{ type: string; turnover: number }[]` | sum `rowsByType` across bills, desc; `null` type name → `"Unassigned"` |

`DashboardKpisVM`:
- `outstandingTotal` = `Σ (total − paidAmount)` over bills whose bucket ≠ `done` and `total > paidAmount`
- `outstandingCount` = number of those bills
- `inProgressCount` / `completedCount` = counts by bucket (`active` / `done`)
- `customerCount` = `customers.length`
- `thisMonthTurnover` / `lastMonthTurnover` + `momChangePct`
- `ytdTurnover`
- `avgBillValue` = `Σ total / bills.length` (0 when empty)
- `collectionRate` = `Σ paidAmount / Σ total` (0 when `Σ total === 0`); `collectedTotal`, `outstandingTotal` for the donut legend

`useSalesSummary()` → `{ data: SalesSummaryVM | undefined, isLoading, isError }` where `isLoading` / `isError` are `useBills` OR `useCustomers` states; `data` is a single `useMemo` producing every aggregate above.

---

## 5. Interim decisions (approved in brainstorming)

1. **Status → bucket.** `shared/constants/billStatus.ts`:
   `pending`, `draft`, `new`, `quote` → `open`; `active`, `in_progress`, `in-progress` → `active`; `completed`, `paid`, `delivered`, `done` → `done`; **any unknown key → `open`**. `isOverdue(bill)` = `bill.deadline != null && new Date(bill.deadline) < startOfToday && bucketOf(bill.statusKey) !== 'done'`. Chips map: All → none; Pending → `open`; In progress → `active`; Completed → `done`; Overdue → `isOverdue`.
2. **`BillCard` progress bar.** Coarse from bucket: `open → 0`, `active → 60`, `done → 100`. `BillCard` accepts an optional `progress?: number` prop; `BillList` passes `progressFromBucket(bill)`. `// TODO: real stage progress via features/tracking` left at the call site. Bar colour: `active → #5A7BFF`, `done → #39C16C`, `open → #7E8DA8`.
3. **`turnoverByOrderType`** relies on the new `BillListItemVM.rowsByType` (`{ [orderTypeName]: Σ amount }`), mapped in `toListItem` from the already-fetched `bill_rows` → `order_types.name`; rows with a null order-type name aggregate under `"Unassigned"`.
4. **Sample vs real.** Charts render whatever the aggregates produce from live data. Sparse data is shown as-is; each chart has an empty state ("No sales in this range"). No seeded/sample numbers ship in code.
5. **Sales nav.** `/sales` appears in the **desktop sidebar** and via the dashboard "Sales detail →" link. The **mobile bottom bar stays 4 tabs**.

---

## 6. Testing

| File | Asserts |
|---|---|
| `dashboard.selectors.test.ts` | day/month/year bucketing incl. boundary dates + zero-fill; `dashboardKpis` math (outstanding, MoM %, avg, collection rate) with a fixed `bills` fixture; `topCustomersByTurnover` ordering + tie; `turnoverByOrderType` incl. `"Unassigned"`; empty-input → zeros, not `NaN` |
| `billStatus.test.ts` | bucket for each known key + unknown fallback; `isOverdue` true/false/none-deadline/done cases |
| `bill.repository.test.ts` | extend: `rowsByType` sums multiple rows of the same type; null type → `"Unassigned"` |
| `BillCard.test.tsx` | renders billNumber, `formatCurrency(total)`, status label; `onOpen` on View; Edit/Delete rendered only with handlers; pending colour swaps on `total===paidAmount` |
| `CustomerCard.test.tsx` | name/company/email/phone/city; `"No company"` + `"No phone"` fallbacks; `billCount` chip; handler calls |
| `BillList.test.tsx` | renders N `BillCard`s; empty → copy |
| `BillsPage.test.tsx` | extend: chip click filters the rendered set (mock `useBills` fixture spanning buckets + an overdue) |
| `CustomerList.test.tsx` | renders N `CustomerCard`s; empty copy |
| `DashboardPage.test.tsx` | mock `useSalesSummary`; KPI values render; `SegmentedControl` switches the dataset passed to the (mocked) chart; loading + error states |
| `SalesPage.test.tsx` | mock `useSalesSummary`; each section renders with data; per-chart empty state on zeros |
| `SegmentedControl.test.tsx` | renders options, active state, `onChange` on click, keyboard (arrow/enter) |
| `StatCard.test.tsx` | label/value/delta sign + colour; sparkline optional |
| `MobileBottomBar.test.tsx` | 4 `NavLink`s, active class on the current route |

**jsdom + recharts:** `vitest.setup.ts` gains a `ResizeObserver` no-op polyfill. `DashboardPage` / `SalesPage` tests `vi.mock('recharts')` down to elements that record their `data` prop (a `<div data-testid>` stub) — assertions are on data, never geometry. `TurnoverBarChart` / `CollectionDonut` themselves are not unit-tested (thin recharts config); they are covered by the render-and-look step.

**Definition of done per stage:** `npm run test` green, `npm run typecheck` clean, `npm run lint` clean.

---

## 7. Delivery — one plan, 7 ordered stages

1. **Foundation** — `recharts` dep; `SegmentedControl`, `StatCard`, `Sparkline`; `billStatus.ts`; `routes.ts` + `navConfig` + `Sidebar` + `AppRouter` Sales wiring (pointing at a temporary `PlaceholderPage` until stage 6); `vitest.setup.ts` polyfill. Tests for the three primitives + `billStatus`.
2. **Aggregation** — `bills.types.ts` + `bill.repository.ts` `rowsByType`; `dashboard.types.ts`; `dashboard.selectors.ts`; `queries/useSalesSummary.ts`. Selector + repo tests.
3. **Bills cards** — `BillCard`; `BillList` → grid; `BillsPage` search + chips. Tests.
4. **Customers cards** — `CustomerCard`; `CustomerList` → grid; `CustomersPage` search styling. Tests.
5. **Dashboard** — `TurnoverBarChart`, `StatusBreakdownBar`, `RecentBillsList`, `HBarList`; `DashboardPage` real build. Tests.
6. **Sales page** — `CollectionDonut`; `SalesPage`; swap the stage-1 placeholder route to `SalesPage`. Tests.
7. **Mobile nav** — glass `MobileBottomBar` (Option A); `AppLayout` padding. Tests.

Each stage: run test/typecheck/lint, then `ready to commit: <msg>` — the user commits.

---

## 8. Constraints (carried from Phases 1–4)

- Supabase access stays in `features/*/data/*.repository.ts` — the dashboard module has **no** repository and must only call existing query hooks.
- View models camelCase; DB rows snake_case until mapped.
- Reuse `formatCurrency`; add no second currency helper.
- Neo tokens only (`src/index.css` `@theme`); introduce no new colours.
- **Do NOT run git.** End each task with `ready to commit: <msg>`.
- `vitest` `test.include` is `src/**` — no config change needed for new tests.
