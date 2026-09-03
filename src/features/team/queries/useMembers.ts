import { useQuery } from '@tanstack/react-query'
import { memberRepository } from '@/features/team/data/member.repository'
import type { MemberRole } from '@/shared/constants/memberRoles'

export function useMembers(role: MemberRole) {
  return useQuery({ queryKey: ['members', role], queryFn: () => memberRepository.list(role) })
}
