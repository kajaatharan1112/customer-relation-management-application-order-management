import { Link } from 'react-router-dom'
import { Card } from '@/shared/ui/Card'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { usePortalBills } from '@/features/portal/queries/usePortalBills'

export default function PortalHomePage() {
  const { data, isLoading, isError } = usePortalBills()

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">My Bills</h1>

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load your bills.</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">No orders yet.</p>
      ) : (
        (data ?? []).map((b) => {
          const pct = b.trackedRows > 0 ? Math.round((b.completedRows / b.trackedRows) * 100) : 0
          return (
            <Link key={b.id} to={`/portal/bills/${b.id}`}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-neo-text-primary)]">{b.billNumber}</span>
                  <StatusBadge label={b.statusLabel} />
                </div>
                <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
                  {formatCurrency(b.total)} · due {b.deadline ?? '—'}
                </p>
                {b.trackedRows > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-neo-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-neo-primary)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--color-neo-text-secondary)]">
                      {b.completedRows} / {b.trackedRows} stages done
                    </p>
                  </div>
                )}
              </Card>
            </Link>
          )
        })
      )}
    </div>
  )
}
