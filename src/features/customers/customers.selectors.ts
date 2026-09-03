import type { BillListItemVM } from '@/features/bills/bills.types'

export interface CustomerFinance {
  billed: number // Σ total across the customer's bills
  outstanding: number // Σ max(total - paidAmount, 0)
  lastOrderDate: string | null // max orderDate ('YYYY-MM-DD…'), null if none
}

export function customerFinancials(bills: BillListItemVM[]): Record<string, CustomerFinance> {
  const out: Record<string, CustomerFinance> = {}
  for (const b of bills) {
    const f = (out[b.customerId] ??= { billed: 0, outstanding: 0, lastOrderDate: null })
    f.billed += b.total
    f.outstanding += Math.max(b.total - b.paidAmount, 0)
    if (f.lastOrderDate === null || b.orderDate > f.lastOrderDate) {
      f.lastOrderDate = b.orderDate
    }
  }
  return out
}
