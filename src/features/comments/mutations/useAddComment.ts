import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentRepository } from '@/features/comments/data/comment.repository'

export function useAddComment(billId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => commentRepository.add(billId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-comments', billId] }),
  })
}
