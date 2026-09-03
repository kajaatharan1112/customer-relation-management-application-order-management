import { useQuery } from '@tanstack/react-query'
import { workflowRepository } from '@/features/settings/data/workflow.repository'

export function useWorkflowTemplates() {
  // Config data — changes rarely; keep it fresh for 5 min so screen switches
  // that read workflow templates don't refetch on every mount.
  return useQuery({
    queryKey: ['workflow_templates'],
    queryFn: workflowRepository.list,
    staleTime: 5 * 60_000,
  })
}
