import { useQuery } from '@tanstack/react-query'
import { workflowRepository } from '@/features/settings/data/workflow.repository'

export function useWorkflowTemplates() {
  return useQuery({ queryKey: ['workflow_templates'], queryFn: workflowRepository.list })
}
