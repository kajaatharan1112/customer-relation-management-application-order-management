import { useQuery } from '@tanstack/react-query'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'

export function useAttachments(billId: string) {
  return useQuery({
    queryKey: ['bill-attachments', billId],
    queryFn: () => attachmentRepository.list(billId),
    enabled: !!billId,
  })
}
