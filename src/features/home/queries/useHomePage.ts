import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { homeRepository } from '@/features/home/data/home.repository'

export function useHomePage() {
  return useQuery({
    queryKey: ['home'],
    queryFn: homeRepository.load,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
}
