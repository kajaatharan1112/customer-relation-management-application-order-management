import { CustomerCard } from '@/features/customers/components/CustomerCard'
import type { CustomerVM } from '@/features/customers/customers.types'
import type { CustomerFinance } from '@/features/customers/customers.selectors'

export function CustomerList({
  customers,
  onEdit,
  onDelete,
  financials,
}: {
  customers: CustomerVM[]
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
  financials?: Record<string, CustomerFinance>
}) {
  if (customers.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No customers yet — add your first.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {customers.map((c) => (
        <CustomerCard
          key={c.profileId}
          customer={c}
          onEdit={onEdit}
          onDelete={onDelete}
          finance={financials?.[c.profileId]}
        />
      ))}
    </div>
  )
}
