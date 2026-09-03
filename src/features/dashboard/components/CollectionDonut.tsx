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
