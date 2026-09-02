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
