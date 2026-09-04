import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/AuthProvider'
import { profileRepository } from '@/features/profile/data/profile.repository'

export function useUpdateOwnProfile() {
  const qc = useQueryClient()
  const { refreshProfile } = useAuth()
  return useMutation({
    mutationFn: (input: { fullName: string; phone: string | null }) =>
      profileRepository.updateOwn(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['own-profile'] })
      await refreshProfile()
    },
  })
}
