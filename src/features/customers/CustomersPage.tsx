import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { useToast } from '@/shared/ui/Toast'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useDeleteCustomer } from '@/features/customers/mutations/useCustomerMutations'
import { CustomerList } from '@/features/customers/components/CustomerList'
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'
import type { CustomerVM } from '@/features/customers/customers.types'

export default function CustomersPage() {
  const { data, isLoading, isError } = useCustomers()
  const del = useDeleteCustomer()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CustomerVM | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomerVM | null>(null)

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
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Customers</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">People you bill.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
          Add customer
        </Button>
      </div>

      <Field
        id="customer-search"
        label=""
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load customers.</p>
      ) : (
        <CustomerList customers={filtered} onEdit={setEditing} onDelete={setConfirmDelete} />
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
