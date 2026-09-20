import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inviteVerificationRepository } from '@/shared/data/inviteVerification.repository'

/**
 * Shared by CustomerFormModal and MemberFormModal's inline "Send OTP" step.
 * Flips the row from 'invited' to 'active' server-side (see admin-verify-invite),
 * so both list caches are invalidated here rather than each caller guessing
 * which one it just verified.
 */
export function useVerifyInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { email: string; token: string; password: string }) =>
      inviteVerificationRepository.verify(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
