import { useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowRepository } from '@/features/settings/data/workflow.repository'
import type { EditableStage } from '@/features/settings/settings.types'

interface SaveWorkflowInput {
  template: { id?: string; name: string; description: string | null; isActive: boolean }
  stages: EditableStage[]
}

export function useSaveWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveWorkflowInput) => {
      const id = await workflowRepository.upsertTemplate(input.template)
      await workflowRepository.saveStages(id, input.stages)
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow_templates'] }),
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workflowRepository.softDeleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow_templates'] }),
  })
}
