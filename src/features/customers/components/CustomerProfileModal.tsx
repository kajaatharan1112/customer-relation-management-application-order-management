import { useState, type InputHTMLAttributes } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useUpdateCustomer, useDeleteCustomer } from '@/features/customers/mutations/useCustomerMutations'
import type { CustomerVM } from '@/features/customers/customers.types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

function ProfileField({
  label,
  full,
  ...props
}: { label: string; full?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={full ? 'col-span-2 block' : 'block'}>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
        {label}
      </span>
      <input
        {...props}
        className="mt-1 w-full border-b border-transparent bg-transparent pb-1 text-sm text-[var(--color-neo-text-primary)] outline-none transition focus:border-[var(--color-neo-primary)] disabled:text-[var(--color-neo-text-secondary)]"
      />
    </label>
  )
}

export function CustomerProfileModal({ customer, onClose }: { customer: CustomerVM; onClose: () => void }) {
  const [fullName, setFullName] = useState(customer.fullName)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [companyName, setCompanyName] = useState(customer.companyName ?? '')
  const [addressLine, setAddressLine] = useState(customer.addressLine ?? '')
  const [city, setCity] = useState(customer.city ?? '')
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const update = useUpdateCustomer()
  const del = useDeleteCustomer()
  const { show } = useToast()

  const dirty =
    fullName !== customer.fullName ||
    phone !== (customer.phone ?? '') ||
    companyName !== (customer.companyName ?? '') ||
    addressLine !== (customer.addressLine ?? '') ||
    city !== (customer.city ?? '') ||
    notes !== (customer.notes ?? '')

  const canSave = dirty && fullName.trim().length > 0

  const onSave = async () => {
    try {
      await update.mutateAsync({
        profileId: customer.profileId,
        input: {
          fullName,
          phone,
          companyName: companyName || null,
          addressLine: addressLine || null,
          city: city || null,
          notes: notes || null,
        },
      })
      show({ type: 'success', title: 'Customer updated' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save customer', message: (err as Error).message })
    }
  }

  const runDelete = async () => {
    try {
      await del.mutateAsync(customer.profileId)
      show({ type: 'success', title: 'Customer deleted' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not delete', message: (err as Error).message })
    } finally {
      setConfirmDelete(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg">
      <div className="flex items-center gap-4 border-b border-[var(--color-neo-secondary)]/15 pb-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), var(--color-neo-primary-2))' }}
        >
          {initials(customer.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border-b border-transparent bg-transparent text-lg font-bold text-[var(--color-neo-text-primary)] outline-none transition focus:border-[var(--color-neo-primary)]"
          />
          <p className="truncate text-xs text-[var(--color-neo-text-secondary)]">{customer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-5">
        <ProfileField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="No phone" />
        <ProfileField
          label="Company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="No company"
        />
        <ProfileField
          label="Address"
          full
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="No address"
        />
        <ProfileField label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="No city" />
        <ProfileField label="Notes" full value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="No notes" />
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-neo-secondary)]/15 pt-4">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95"
        >
          <Trash2 size={15} />Delete customer
        </button>
        {dirty && (
          <Button variant="primary" size="sm" disabled={!canSave || update.isPending} onClick={onSave}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete customer?">
        {customer.billCount > 0 ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            "{customer.fullName}" has {customer.billCount} active bill(s). Delete those first.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-neo-text-secondary)]">
              This disables "{customer.fullName}" and hides them from the list.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runDelete}>
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Modal>
  )
}
