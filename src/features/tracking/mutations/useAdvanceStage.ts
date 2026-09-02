import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trackingRepository } from '@/features/tracking/data/tracking.repository'

export function useAdvanceStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { rowId: string; toStageId: string; note: string | null; billId: string }) =>
      trackingRepository.advanceStage(v.rowId, v.toStageId, v.note),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['bills', v.billId] })
      qc.invalidateQueries({ queryKey: ['bill-history', v.billId] })
    },
  })
}
