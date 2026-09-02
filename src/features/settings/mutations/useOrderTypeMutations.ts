import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

export function useSaveOrderType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: orderTypeRepository.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order_types'] }),
  })
}

export function useDeleteOrderType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => orderTypeRepository.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order_types'] }),
  })
}
