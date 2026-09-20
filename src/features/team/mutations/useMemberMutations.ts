import { useMutation, useQueryClient } from '@tanstack/react-query'
import { memberRepository } from '@/features/team/data/member.repository'
import type { MemberOtherDetails } from '@/features/team/team.types'
import type { MemberRole } from '@/shared/constants/memberRoles'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['members'] })
}

export function useCreateMember() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: {
      fullName: string
      email: string
      phone: string
      role: MemberRole
      otherDetails: MemberOtherDetails
    }) => memberRepository.create(v),
    onSuccess: inv,
  })
}

export function useUpdateMember() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { profileId: string; fullName: string; phone: string }) =>
      memberRepository.updateDetail(v.profileId, { fullName: v.fullName, phone: v.phone }),
    onSuccess: inv,
  })
}

export function useUpdateMemberOtherDetails() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { profileId: string; otherDetails: MemberOtherDetails }) =>
      memberRepository.updateOtherDetails(v.profileId, v.otherDetails),
    onSuccess: inv,
  })
}

export function useSetMemberStatus() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { profileId: string; status: 'active' | 'disabled' }) =>
      memberRepository.setStatus(v.profileId, v.status),
    onSuccess: inv,
  })
}
