import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billRepository } from '@/features/bills/data/bill.repository'
import type { BillRowDraft } from '@/features/bills/bills.types'

function useInv() {
  const qc = useQueryClient()
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['bills'] })
    if (id) qc.invalidateQueries({ queryKey: ['bills', id] })
  }
}

export function useSaveBill() {
  const inv = useInv()
  return useMutation({
    mutationFn: (v: { bill: Parameters<typeof billRepository.save>[0]; rows: BillRowDraft[] }) =>
      billRepository.save(v.bill, v.rows),
    onSuccess: (id) => inv(id),
  })
}

export function useSetBillStatus() {
  const inv = useInv()
  return useMutation({
    mutationFn: (v: { id: string; statusKey: string }) => billRepository.setStatus(v.id, v.statusKey),
    onSuccess: (_d, v) => inv(v.id),
  })
}

export function useRecordPayment() {
  const inv = useInv()
  return useMutation({
    mutationFn: (v: { id: string; paidAmount: number }) =>
      billRepository.recordPayment(v.id, v.paidAmount),
    onSuccess: (_d, v) => inv(v.id),
  })
}

export function useDeleteBill() {
  const inv = useInv()
  return useMutation({
    mutationFn: (id: string) => billRepository.softDelete(id),
    onSuccess: () => inv(),
  })
}
