import { useQuery } from '@tanstack/react-query'
import { billRepository } from '@/features/bills/data/bill.repository'

export function useBills() {
  return useQuery({ queryKey: ['bills'], queryFn: billRepository.list })
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billRepository.get(id),
    enabled: !!id,
  })
}
