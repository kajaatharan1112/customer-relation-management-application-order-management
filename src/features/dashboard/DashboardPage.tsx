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
  const dueThisWeek = useMemo(() => {
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAhead = new Date(startToday)
    weekAhead.setDate(weekAhead.getDate() + 7)
    return (bills.data ?? []).filter((b) => {
      if (bucketOf(b.statusKey) === 'done' || !b.deadline) return false
      const d = new Date(b.deadline)
      return d >= startToday && d <= weekAhead
    }).length
  }, [bills.data])

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
    <div className="space-y-5 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          As of {new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="kpi-cards">
        <StatCard dense label="Outstanding" value={formatLKRShort(k.outstandingTotal)} icon={CreditCard} tone="danger" sub={`${k.outstandingCount} unpaid · ${overdueCount} overdue`} />
        <StatCard dense label="In progress" value={String(k.inProgressCount)} icon={Loader} tone="primary" sub={`${dueThisWeek} due this week`} />
        <StatCard dense label="Completed" value={String(k.completedCount)} icon={CheckCircle} tone="success" sub="delivered" />
        <StatCard dense label="Customers" value={String(k.customerCount)} icon={Users} tone="neutral" sub={k.customerCount === 1 ? '1 total' : `${k.customerCount} total`} />
      </div>

      <Card className="p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-neo-text-primary)]">
              {grain === 'day' ? 'Daily' : grain === 'year' ? 'Yearly' : 'Monthly'} turnover
            </h2>
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
