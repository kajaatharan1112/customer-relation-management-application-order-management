import { useMemo, useState } from 'react'
import { Plus, Search, Users, Wallet, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { StatCard } from '@/shared/ui/StatCard'
import { useToast } from '@/shared/ui/Toast'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useBills } from '@/features/bills/queries/useBills'
import { customerFinancials } from '@/features/customers/customers.selectors'
import { useDeleteCustomer } from '@/features/customers/mutations/useCustomerMutations'
import { CustomerList } from '@/features/customers/components/CustomerList'
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'
import type { CustomerVM } from '@/features/customers/customers.types'

export default function CustomersPage() {
  const { data, isLoading, isError } = useCustomers()
  const bills = useBills()
  const del = useDeleteCustomer()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CustomerVM | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomerVM | null>(null)

  const financials = useMemo(() => customerFinancials(bills.data ?? []), [bills.data])

  const total = (data ?? []).length
  const withOpenBalance = (data ?? []).filter((c) => (financials[c.profileId]?.outstanding ?? 0) > 0).length
  const totalOutstanding = Object.values(financials).reduce((s, f) => s + f.outstanding, 0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = data ?? []
    if (!q) return all
    return all.filter((c) =>
      [c.fullName, c.companyName, c.email].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [data, search])

  const runDelete = async () => {
    if (!confirmDelete) return
    try {
      await del.mutateAsync(confirmDelete.profileId)
      show({ type: 'success', title: 'Customer deleted' })
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
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Customers</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">People you bill.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
          Add customer
        </Button>
      </div>

      <div data-testid="customer-summary" className="grid grid-cols-3 gap-3">
        <StatCard dense label="Customers" value={String(total)} icon={Users} tone="neutral" />
        <StatCard dense label="With open balance" value={String(withOpenBalance)} icon={AlertCircle} tone="warning" />
        <StatCard dense label="Outstanding" value={formatLKRShort(totalOutstanding)} icon={Wallet} tone="danger" />
      </div>

      <div className="relative sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-neo-text-secondary)]" />
        <input
          type="text"
          aria-label="Search customers"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] pl-10 pr-4 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none placeholder:text-[var(--color-neo-text-secondary)]"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load customers.</p>
      ) : (
        <CustomerList customers={filtered} onEdit={setEditing} onDelete={setConfirmDelete} financials={financials} />
      )}

      {editing && (
        <CustomerFormModal
          customer={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete customer?">
        {confirmDelete && confirmDelete.billCount > 0 ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            "{confirmDelete.fullName}" has {confirmDelete.billCount} active bill(s). Delete those first.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-neo-text-secondary)]">
              This disables "{confirmDelete?.fullName}" and hides them from the list.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runDelete}>
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
