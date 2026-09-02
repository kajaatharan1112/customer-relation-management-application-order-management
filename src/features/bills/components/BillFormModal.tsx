import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { BillRowsEditor } from '@/features/bills/components/BillRowsEditor'
import { useSaveBill } from '@/features/bills/mutations/useBillMutations'
import type { BillDetailVM, BillRowDraft } from '@/features/bills/bills.types'
import type { CustomerVM } from '@/features/customers/customers.types'

const today = () => new Date().toISOString().slice(0, 10)

export function BillFormModal({
  bill,
  customers,
  orderTypes,
  onClose,
  onSaved,
}: {
  bill?: BillDetailVM
  customers: CustomerVM[]
  orderTypes: { id: string; name: string; fixedAmount: number | null }[]
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const [customerId, setCustomerId] = useState(bill?.customerId ?? '')
  const [orderDate, setOrderDate] = useState(bill?.orderDate ?? today())
  const [deadline, setDeadline] = useState(bill?.deadline ?? '')
  const [notes, setNotes] = useState(bill?.notes ?? '')
  const [rows, setRows] = useState<BillRowDraft[]>(
    bill?.rows.map((r) => ({
      id: r.id,
      detail: r.detail,
      orderTypeId: r.orderTypeId,
      amount: r.amount,
    })) ?? [],
  )
  const save = useSaveBill()
  const { show } = useToast()

  const canSave = customerId.length > 0 && rows.some((r) => r.detail.trim().length > 0)

  const onSave = async () => {
    try {
      const id = await save.mutateAsync({
        bill: {
          id: bill?.id,
          customerId,
          orderDate,
          deadline: deadline || null,
          notes: notes || null,
        },
        rows: rows.filter((r) => r.detail.trim().length > 0),
      })
      show({ type: 'success', title: bill ? 'Bill updated' : 'Bill created' })
      onSaved?.(id)
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save bill', message: (err as Error).message })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={bill ? `Edit ${bill.billNumber}` : 'New bill'}
      className="max-w-2xl"
    >
      <div className="mb-4">
        <label
          htmlFor="bill-customer"
          className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]"
        >
          Customer
        </label>
        <select
          id="bill-customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-10 w-full rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] px-3 text-sm shadow-[var(--shadow-neo-pressed)]"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.profileId} value={c.profileId}>
              {c.fullName}
              {c.companyName ? ` · ${c.companyName}` : ''}
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
            No customers yet — add one on the Customers page first.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Field
          id="bill-order-date"
          label="Order date"
          type="date"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
        />
        <Field
          id="bill-deadline"
          label="Deadline (optional)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <Field
        id="bill-notes"
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <BillRowsEditor rows={rows} orderTypes={orderTypes} onChange={setRows} />

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canSave || save.isPending}
          onClick={onSave}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
