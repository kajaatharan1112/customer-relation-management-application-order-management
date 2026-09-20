import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { useBills } from '@/features/bills/queries/useBills'
import { useDeleteBill, useRecordPayment } from '@/features/bills/mutations/useBillMutations'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { BillList } from '@/features/bills/components/BillList'
import { BillFormModal } from '@/features/bills/components/BillFormModal'
import { BillDetailModal } from '@/features/bills/components/BillDetailModal'
import { RecordPaymentModal } from '@/features/bills/components/RecordPaymentModal'
import { BILL_FILTERS, matchesFilter, type BillFilterKey } from '@/shared/constants/billStatus'
import { ROUTES } from '@/shared/constants/routes'
import type { BillListItemVM } from '@/features/bills/bills.types'

export default function BillsPage() {
  const navigate = useNavigate()
  const { id: openBillId } = useParams()
  const { data, isLoading, isError } = useBills()
  const { data: customers } = useCustomers()
  const { data: orderTypes } = useOrderTypes()
  const del = useDeleteBill()
  const recordPayment = useRecordPayment()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<BillFilterKey>('all')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<BillListItemVM | null>(null)
  const [paying, setPaying] = useState<BillListItemVM | null>(null)

  const otOptions = (orderTypes ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({ id: o.id, name: o.name, fixedAmount: o.fixedAmount }))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter(
      (b) =>
        matchesFilter(b, filter) &&
        (q === '' ||
          b.billNumber.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q)),
    )
  }, [data, search, filter])

  const runDelete = async () => {
    if (!confirmDelete) return
    try {
      await del.mutateAsync(confirmDelete.id)
      show({ type: 'success', title: 'Bill deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete', message: (err as Error).message })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-5 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Bills</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            Customer orders and invoices.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          New bill
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-neo-text-secondary)]" />
          <input
            type="text"
            aria-label="Search bills"
            placeholder="Search bills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] pl-10 pr-4 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none placeholder:text-[var(--color-neo-text-secondary)]"
          />
        </div>
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
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load bills.</p>
      ) : (
        <BillList
          bills={filtered}
          onOpen={(b) => navigate(`/bills/${b.id}`)}
          onDelete={setConfirmDelete}
          onRecordPayment={setPaying}
        />
      )}

      <BillDetailModal billId={openBillId ?? null} onClose={() => navigate(ROUTES.bills)} />

      {paying && (
        <RecordPaymentModal
          balance={paying.total - paying.paidAmount}
          onClose={() => setPaying(null)}
          onSubmit={async (amount) => {
            try {
              await recordPayment.mutateAsync({ id: paying.id, paidAmount: amount })
              show({ type: 'success', title: 'Payment recorded' })
            } catch (err) {
              show({ type: 'error', title: 'Could not record payment', message: (err as Error).message })
            } finally {
              setPaying(null)
            }
          }}
        />
      )}

      {creating && (
        <BillFormModal
          customers={customers ?? []}
          orderTypes={otOptions}
          onClose={() => setCreating(false)}
          onSaved={(id) => navigate(`/bills/${id}`)}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete bill?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          This deletes {confirmDelete?.billNumber}.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={runDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
