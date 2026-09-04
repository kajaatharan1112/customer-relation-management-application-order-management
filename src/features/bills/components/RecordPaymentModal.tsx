import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { FormActions } from '@/shared/ui/form/FormActions'
import { Button } from '@/shared/ui/Button'

export function RecordPaymentModal({
  balance,
  onSubmit,
  onClose,
}: {
  balance: number
  onSubmit: (amount: number) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState(String(balance))
  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      footer={
        <FormActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSubmit(Number(amount) || 0)}>
            Save
          </Button>
        </FormActions>
      }
    >
      <div className="space-y-2">
        <Field
          id="pay-amount"
          label="Total paid so far"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-[var(--color-neo-text-secondary)]">
          This sets the running paid total for the bill (it replaces the previous value).
        </p>
      </div>
    </Modal>
  )
}
