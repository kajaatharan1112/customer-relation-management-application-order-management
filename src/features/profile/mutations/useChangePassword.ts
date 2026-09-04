import { useMutation } from '@tanstack/react-query'
import { profileRepository } from '@/features/profile/data/profile.repository'

export function useChangePassword() {
  return useMutation({
    mutationFn: (password: string) => profileRepository.changePassword(password),
  })
}
