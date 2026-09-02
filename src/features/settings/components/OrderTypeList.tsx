import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { OrderTypeVM } from '@/features/settings/settings.types'

export function OrderTypeList({
  orderTypes,
  canWrite,
  onEdit,
  onDelete,
}: {
  orderTypes: OrderTypeVM[]
  canWrite: boolean
  onEdit: (o: OrderTypeVM) => void
  onDelete: (o: OrderTypeVM) => void
}) {
  if (orderTypes.length === 0) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">No order types yet.</p>
  }

  return (
    <div className="space-y-3">
      {orderTypes.map((o) => (
        <Card key={o.id} className="flex items-center justify-between p-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-[var(--color-neo-text-primary)]">{o.name}</h4>
              <StatusBadge
                label={o.isActive ? 'Active' : 'Inactive'}
                color={o.isActive ? 'var(--color-neo-success)' : 'var(--color-neo-secondary)'}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
              {o.workflowName} · {formatCurrency(o.fixedAmount)}
            </p>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(o)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(o)}>
                Delete
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
