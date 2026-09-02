import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { BillListItemVM } from '@/features/bills/bills.types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--color-neo-secondary)',
  active: 'var(--color-neo-primary)',
  completed: 'var(--color-neo-success)',
  paid: 'var(--color-neo-success)',
}

export function BillList({
  bills,
  onOpen,
  onDelete,
}: {
  bills: BillListItemVM[]
  onOpen: (b: BillListItemVM) => void
  onDelete: (b: BillListItemVM) => void
}) {
  if (bills.length === 0) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">No bills yet.</p>
  }
  return (
    <div className="space-y-3">
      {bills.map((b) => (
        <Card key={b.id} className="flex items-center justify-between p-4">
          <button type="button" onClick={() => onOpen(b)} className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-neo-text-primary)]">
                {b.billNumber}
              </span>
              <StatusBadge label={b.statusLabel} color={STATUS_COLOR[b.statusKey]} />
            </div>
            <p className="text-xs text-[var(--color-neo-text-secondary)]">
              {b.customerName} · {formatCurrency(b.total)} · due {b.deadline ?? '—'}
            </p>
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpen(b)}>
              Open
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(b)}>
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
