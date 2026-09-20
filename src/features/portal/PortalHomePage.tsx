import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BillCard } from '@/features/bills/components/BillCard'
import { usePortalBills } from '@/features/portal/queries/usePortalBills'
import { BILL_FILTERS, matchesFilter, type BillFilterKey } from '@/shared/constants/billStatus'
import type { PortalBillListVM } from '@/features/portal/portal.types'
import type { BillListItemVM } from '@/features/bills/bills.types'

function toBillCardVM(b: PortalBillListVM): BillListItemVM {
  return {
    id: b.id,
    billNumber: b.billNumber,
    customerId: '',
    customerName: '',
    statusKey: b.statusKey,
    statusLabel: b.statusLabel,
    total: b.total,
    paidAmount: b.paidAmount,
    orderDate: b.orderDate,
    deadline: b.deadline,
    rowsByType: {},
  }
}

export default function PortalHomePage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = usePortalBills()
  const [filter, setFilter] = useState<BillFilterKey>('all')

  const filtered = useMemo(() => (data ?? []).filter((b) => matchesFilter(b, filter)), [data, filter])

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">My Bills</h1>
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Your orders and their progress.</p>
      </div>

      {(data ?? []).length > 0 && (
        <div className="flex flex-nowrap gap-2 overflow-x-auto md:flex-wrap md:overflow-visible">
          {BILL_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={
                filter === f.key
                  ? 'h-8 shrink-0 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-primary)] px-4 text-xs font-semibold text-white shadow-[var(--shadow-neo-soft)]'
                  : 'h-8 shrink-0 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-surface)] px-4 text-xs font-semibold text-[var(--color-neo-text-secondary)] shadow-[var(--shadow-neo-pressed)]'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load your bills.</p>
      ) : (data ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No orders yet.</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BillCard key={b.id} bill={toBillCardVM(b)} onOpen={(bill) => navigate(`/portal/bills/${bill.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
