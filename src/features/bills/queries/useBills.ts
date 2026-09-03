import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { billRepository } from '@/features/bills/data/bill.repository'

export function useBills() {
  // keepPreviousData: while a background refetch runs, keep showing the last
  // result instead of dropping to undefined (which blanks list/search/chart views).
  return useQuery({
    queryKey: ['bills'],
    queryFn: billRepository.list,
    placeholderData: keepPreviousData,
  })
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billRepository.get(id),
    enabled: !!id,
  })
}
