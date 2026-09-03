import { useQuery } from '@tanstack/react-query'
import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

export function useOrderTypes() {
  // Config data — changes rarely; keep it fresh for 5 min so screen switches
  // that read order types don't refetch on every mount.
  return useQuery({
    queryKey: ['order_types'],
    queryFn: orderTypeRepository.list,
    staleTime: 5 * 60_000,
  })
}
