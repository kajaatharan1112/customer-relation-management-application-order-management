import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customerRepository } from '@/features/customers/data/customer.repository'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['customers'] })
}

export function useCreateCustomer() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: customerRepository.createWithLogin, onSuccess: inv })
}

export function useUpdateCustomer() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: {
      profileId: string
      input: Parameters<typeof customerRepository.updateDetail>[1]
    }) => customerRepository.updateDetail(v.profileId, v.input),
    onSuccess: inv,
  })
}

export function useDeleteCustomer() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (profileId: string) => customerRepository.softDelete(profileId),
    onSuccess: inv,
  })
}
