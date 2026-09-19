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
    <div className="space-y-5 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Sales &amp; turnover</h1>
        </div>
        <span className="flex items-center gap-2 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--color-neo-text-secondary)] shadow-[var(--shadow-neo-pressed)]">
          <Calendar size={14} />
          Last 12 months
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard dense label="This month turnover" value={formatLKRShort(k.thisMonthTurnover)} icon={TrendingUp} deltaPct={k.momChangePct} spark={data.byMonth.map((d) => d.turnover)} sub={`vs ${formatLKRShort(k.lastMonthTurnover)} last month`} />
        <StatCard dense label="Turnover YTD" value={formatLKRShort(k.ytdTurnover)} icon={Wallet} spark={data.byMonth.map((d) => d.turnover)} />
        <StatCard dense label="Avg bill value" value={formatLKRShort(k.avgBillValue)} icon={Receipt} />
        <StatCard dense label="Collection rate" value={`${Math.round(k.collectionRate * 100)}%`} icon={PieIcon} tone="success" sub={`${formatLKRShort(k.outstandingTotal)} outstanding`} />
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
            <CollectionDonut collected={k.collectedTotal} outstanding={Math.max(k.billedTotal - k.collectedTotal, 0)} />
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
