import { useQuery } from '@tanstack/react-query'
import { maintenanceRepository } from '@/features/maintenance/data/maintenance.repository'

export function useMaintenanceStats(before: string) {
  return useQuery({
    queryKey: ['maintenance-stats', before],
    queryFn: () => maintenanceRepository.stats(before),
    staleTime: 60_000,
  })
}
