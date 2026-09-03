import { BillCard } from '@/features/bills/components/BillCard'
import type { BillListItemVM } from '@/features/bills/bills.types'

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
    return <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills found.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bills.map((b) => (
        <BillCard key={b.id} bill={b} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  )
}
