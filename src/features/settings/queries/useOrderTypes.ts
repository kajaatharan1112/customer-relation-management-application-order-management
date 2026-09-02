import { useQuery } from '@tanstack/react-query'
import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

export function useOrderTypes() {
  return useQuery({ queryKey: ['order_types'], queryFn: orderTypeRepository.list })
}
