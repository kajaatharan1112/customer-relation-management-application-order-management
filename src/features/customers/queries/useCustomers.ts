import { useQuery } from '@tanstack/react-query'
import { customerRepository } from '@/features/customers/data/customer.repository'

export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: customerRepository.list })
}
