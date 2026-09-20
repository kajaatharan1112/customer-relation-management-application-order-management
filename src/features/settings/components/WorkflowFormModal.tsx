import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { StageEditor } from '@/features/settings/components/StageEditor'
import { useSaveWorkflow } from '@/features/settings/mutations/useWorkflowMutations'
import type { EditableStage, WorkflowTemplateVM } from '@/features/settings/settings.types'

export function WorkflowFormModal({
  template,
  onClose,
}: {
  template?: WorkflowTemplateVM
  onClose: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [stages, setStages] = useState<EditableStage[]>(
    template?.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, isFinal: s.isFinal })) ?? [],
  )
  const { mutateAsync, isPending } = useSaveWorkflow()
  const { show } = useToast()

  const isEdit = !!template
  const initialStages = template?.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, isFinal: s.isFinal })) ?? []
  const dirty =
    isEdit &&
    (name !== template!.name ||
      description !== (template!.description ?? '') ||
      isActive !== template!.isActive ||
      JSON.stringify(stages) !== JSON.stringify(initialStages))

  const finalCount = stages.filter((s) => s.isFinal).length
  const canSave =
    name.trim().length > 0 &&
    stages.length > 0 &&
    stages.every((s) => s.name.trim().length > 0) &&
    finalCount === 1 &&
    (!isEdit || dirty)

  const onSave = async () => {
    try {
      await mutateAsync({
        template: { id: template?.id, name, description: description || null, isActive },
        stages,
      })
      show({ type: 'success', title: template ? 'Workflow updated' : 'Workflow created' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save workflow', message: (err as Error).message })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={template ? 'Edit workflow' : 'Create workflow'}
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
        <Field id="workflow-name" label="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          id="workflow-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormGrid>

      <label className="mt-4 flex items-center gap-2 text-sm text-[var(--color-neo-text-primary)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      <div className="mt-4">
        <StageEditor stages={stages} onChange={setStages} />
      </div>
    </Modal>
  )
}
