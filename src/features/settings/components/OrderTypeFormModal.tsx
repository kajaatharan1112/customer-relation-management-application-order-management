import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { Select } from '@/shared/ui/form/Select'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
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

  const isEdit = !!orderType
  const dirty =
    isEdit &&
    (name !== orderType!.name ||
      workflowTemplateId !== orderType!.workflowTemplateId ||
      fixedAmount !== (orderType!.fixedAmount?.toString() ?? '') ||
      isActive !== orderType!.isActive)

  const activeWorkflows = workflows.filter((w) => w.isActive)
  const canSave = name.trim().length > 0 && workflowTemplateId.length > 0 && (!isEdit || dirty)

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
    <Modal
      open
      onClose={onClose}
      title={orderType ? 'Edit order type' : 'Create order type'}
      size="lg"
      footer={
        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {(!isEdit || dirty) && (
            <Button type="button" variant="primary" disabled={!canSave || isPending} onClick={onSave}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </FormActions>
      }
    >
      <FormGrid>
        <Field id="order-type-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />

        <Select
          id="workflow-select"
          label="Workflow"
          value={workflowTemplateId}
          onChange={(e) => setWorkflowTemplateId(e.target.value)}
          error={
            activeWorkflows.length === 0
              ? 'No active workflows yet — create one on the Workflows tab first.'
              : undefined
          }
        >
          <option value="">Select a workflow…</option>
          {activeWorkflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>

        <Field
          id="fixed-amount"
          label="Fixed amount (optional)"
          type="number"
          min="0"
          value={fixedAmount}
          onChange={(e) => setFixedAmount(e.target.value)}
        />
      </FormGrid>

      <label className="mt-4 flex items-center gap-2 text-sm text-[var(--color-neo-text-primary)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
    </Modal>
  )
}
