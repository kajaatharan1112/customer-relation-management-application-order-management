import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { Select } from '@/shared/ui/form/Select'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
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
      size="lg"
      footer={
        <FormActions>
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
        </FormActions>
      }
    >
      <FormGrid>
        <Select
          id="bill-customer"
          label="Customer"
          full
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          error={
            customers.length === 0
              ? 'No customers yet — add one on the Customers page first.'
              : undefined
          }
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.profileId} value={c.profileId}>
              {c.fullName}
              {c.companyName ? ` · ${c.companyName}` : ''}
            </option>
          ))}
        </Select>

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
        <Field
          id="bill-notes"
          label="Notes (optional)"
          full
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormGrid>

      <div className="mt-4">
        <BillRowsEditor rows={rows} orderTypes={orderTypes} onChange={setRows} />
      </div>
    </Modal>
  )
}
