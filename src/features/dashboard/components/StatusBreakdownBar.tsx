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
