import { useQuery } from '@tanstack/react-query'
import { commentRepository } from '@/features/comments/data/comment.repository'

export function useComments(billId: string) {
  return useQuery({
    queryKey: ['bill-comments', billId],
    queryFn: () => commentRepository.list(billId),
    enabled: !!billId,
  })
}
