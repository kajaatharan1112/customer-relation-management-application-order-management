import { formatLKRShort } from '@/shared/utils/formatLKRShort'

export function HBarList({ items, max }: { items: { name: string; value: number }[]; max?: number }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-neo-text-secondary)]">No data</p>
  }
  const top = max && max > 0 ? max : Math.max(...items.map((i) => i.value), 1)
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
