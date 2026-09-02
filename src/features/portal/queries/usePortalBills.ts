import { useQuery } from '@tanstack/react-query'
import { portalBillRepository } from '@/features/portal/data/portalBill.repository'

export function usePortalBills() {
  return useQuery({ queryKey: ['portal-bills'], queryFn: portalBillRepository.list })
}

export function usePortalBill(id: string) {
  return useQuery({
    queryKey: ['portal-bill', id],
    queryFn: () => portalBillRepository.get(id),
    enabled: !!id,
  })
}
