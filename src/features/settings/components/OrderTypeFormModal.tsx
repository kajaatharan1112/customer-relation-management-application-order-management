import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useSaveOrderType } from '@/features/settings/mutations/useOrderTypeMutations'
import type { OrderTypeVM, WorkflowTemplateVM } from '@/features/settings/settings.types'

export function OrderTypeFormModal({
  orderType,
  workflows,
  onClose,
}: {
  orderType?: OrderTypeVM
  workflows: WorkflowTemplateVM[]
  onClose: () => void
}) {
  const [name, setName] = useState(orderType?.name ?? '')
  const [workflowTemplateId, setWorkflowTemplateId] = useState(orderType?.workflowTemplateId ?? '')
  const [fixedAmount, setFixedAmount] = useState(orderType?.fixedAmount?.toString() ?? '')
  const [isActive, setIsActive] = useState(orderType?.isActive ?? true)
  const { mutateAsync, isPending } = useSaveOrderType()
  const { show } = useToast()

  const activeWorkflows = workflows.filter((w) => w.isActive)
  const canSave = name.trim().length > 0 && workflowTemplateId.length > 0

  const onSave = async () => {
    try {
      await mutateAsync({
        id: orderType?.id,
        name,
        workflowTemplateId,
        fixedAmount: fixedAmount === '' ? null : Number(fixedAmount),
        isActive,
      })
      show({ type: 'success', title: orderType ? 'Order type updated' : 'Order type created' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save order type', message: (err as Error).message })
    }
  }

  return (
    <Modal open onClose={onClose} title={orderType ? 'Edit order type' : 'Create order type'}>
      <Field id="order-type-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="mb-4">
        <label
          htmlFor="workflow-select"
          className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]"
        >
          Workflow
        </label>
        <select
          id="workflow-select"
          value={workflowTemplateId}
          onChange={(e) => setWorkflowTemplateId(e.target.value)}
          className="h-10 w-full rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] px-3 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)]"
        >
          <option value="">Select a workflow…</option>
          {activeWorkflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {activeWorkflows.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">
            No active workflows yet — create one on the Workflows tab first.
          </p>
        )}
      </div>

      <Field
        id="fixed-amount"
        label="Fixed amount (optional)"
        type="number"
        min="0"
        value={fixedAmount}
        onChange={(e) => setFixedAmount(e.target.value)}
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-[var(--color-neo-text-primary)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!canSave || isPending} onClick={onSave}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  )
}
