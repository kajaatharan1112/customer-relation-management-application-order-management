import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import type { CustomerVM } from '@/features/customers/customers.types'

export function CustomerList({
  customers,
  onEdit,
  onDelete,
}: {
  customers: CustomerVM[]
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
}) {
  if (customers.length === 0) {
    return (
      <p className="text-sm text-[var(--color-neo-text-secondary)]">
        No customers yet — add your first.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {customers.map((c) => (
        <Card key={c.profileId} className="flex items-center justify-between p-4">
          <div>
            <h4 className="font-semibold text-[var(--color-neo-text-primary)]">{c.fullName}</h4>
            <p className="text-xs text-[var(--color-neo-text-secondary)]">
              {[c.companyName, c.email, c.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(c)}>
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
