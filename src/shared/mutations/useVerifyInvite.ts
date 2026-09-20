import { useMutation } from '@tanstack/react-query'
import { inviteVerificationRepository } from '@/shared/data/inviteVerification.repository'

/** Shared by CustomerFormModal and MemberFormModal's inline "Send OTP" step. */
export function useVerifyInvite() {
  return useMutation({
    mutationFn: (v: { email: string; token: string; password: string }) =>
      inviteVerificationRepository.verify(v),
  })
}
