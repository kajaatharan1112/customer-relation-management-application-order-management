import { useQuery } from '@tanstack/react-query'
import { trackingRepository } from '@/features/tracking/data/tracking.repository'

export function useBillHistory(billId: string) {
  return useQuery({
    queryKey: ['bill-history', billId],
    queryFn: () => trackingRepository.listHistory(billId),
    enabled: !!billId,
  })
}
