import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/AuthProvider'
import { applyAccent } from '@/core/theme/applyAccent'
import { DEFAULT_ACCENT, type AccentKey } from '@/core/theme/accents'
import { profileRepository } from '@/features/profile/data/profile.repository'

/**
 * Applies the accent to the UI immediately (optimistic), then persists it.
 * On failure it rolls the UI back to the profile's current accent.
 */
export function useUpdateAccent() {
  const { profile, refreshProfile } = useAuth()
  return useMutation({
    mutationFn: async (key: AccentKey) => {
      applyAccent(key)
      await profileRepository.setAccent(key)
    },
    onError: () => {
      applyAccent(profile?.themeColor ?? DEFAULT_ACCENT)
    },
    onSuccess: async () => {
      await refreshProfile()
    },
  })
}
