import { CustomerListItem } from '@/features/customers/components/CustomerListItem'
import type { CustomerVM } from '@/features/customers/customers.types'
import type { CustomerFinance } from '@/features/customers/customers.selectors'

export function CustomerList({
  customers,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddBill,
  financials,
}: {
  customers: CustomerVM[]
  selectedId?: string | null
  onSelect: (c: CustomerVM) => void
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
  onAddBill: (c: CustomerVM) => void
  financials?: Record<string, CustomerFinance>
}) {
  if (customers.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No customers yet — add your first.</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {customers.map((c) => (
        <CustomerListItem
          key={c.profileId}
          customer={c}
          selected={c.profileId === selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddBill={onAddBill}
          finance={financials?.[c.profileId]}
        />
      ))}
    </div>
  )
}
