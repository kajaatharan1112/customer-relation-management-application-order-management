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
