import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { useToast } from '@/shared/ui/Toast'
import { useBills } from '@/features/bills/queries/useBills'
import { useDeleteBill } from '@/features/bills/mutations/useBillMutations'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { BillList } from '@/features/bills/components/BillList'
import { BillFormModal } from '@/features/bills/components/BillFormModal'
import type { BillListItemVM } from '@/features/bills/bills.types'

export default function BillsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useBills()
  const { data: customers } = useCustomers()
  const { data: orderTypes } = useOrderTypes()
  const del = useDeleteBill()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<BillListItemVM | null>(null)

  const otOptions = (orderTypes ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({ id: o.id, name: o.name, fixedAmount: o.fixedAmount }))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = data ?? []
    if (!q) return all
    return all.filter(
      (b) =>
        b.billNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q),
    )
  }, [data, search])

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
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Bills</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            Customer orders and invoices.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          New bill
        </Button>
      </div>

      <Field
        id="bill-search"
        label=""
        placeholder="Search bills…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load bills.</p>
      ) : (
        <BillList
          bills={filtered}
          onOpen={(b) => navigate(`/bills/${b.id}`)}
          onDelete={setConfirmDelete}
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
