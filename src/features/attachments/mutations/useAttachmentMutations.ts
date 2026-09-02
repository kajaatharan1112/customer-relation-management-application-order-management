import { useMutation, useQueryClient } from '@tanstack/react-query'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'

export function useUploadAttachment(billId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => attachmentRepository.upload(billId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-attachments', billId] }),
  })
}

export function useRemoveAttachment(billId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; path: string }) => attachmentRepository.remove(v.id, v.path),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-attachments', billId] }),
  })
}
