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
          formatter={(v) => [formatLKRShort(v as number), 'Turnover']}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-neo-floating)' }}
        />
        <Bar dataKey="value" fill="var(--color-neo-primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  )
}
