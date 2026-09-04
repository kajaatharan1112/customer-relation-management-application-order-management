import { useQuery } from '@tanstack/react-query'
import { profileRepository } from '@/features/profile/data/profile.repository'

export function useOwnProfile() {
  return useQuery({
    queryKey: ['own-profile'],
    queryFn: profileRepository.getOwn,
  })
}
