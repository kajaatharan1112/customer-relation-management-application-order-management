import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { customerRepository } from '@/features/customers/data/customer.repository'

export function useCustomers() {
  // keepPreviousData: while a background refetch runs, keep showing the last
  // result instead of dropping to undefined (which blanks list/search views).
  return useQuery({
    queryKey: ['customers'],
    queryFn: customerRepository.list,
    placeholderData: keepPreviousData,
  })
}
