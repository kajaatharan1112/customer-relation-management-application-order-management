import { customerFinancials } from '@/features/customers/customers.selectors'
import type { BillListItemVM } from '@/features/bills/bills.types'

const bill = (over: Partial<BillListItemVM>): BillListItemVM => ({
  id: 'x', billNumber: 'B', customerId: 'c1', customerName: 'C',
  statusKey: 'pending', statusLabel: 'Pending', total: 0, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...over,
})

describe('customerFinancials', () => {
  it('sums billed/outstanding and tracks last order per customer', () => {
    const bills = [
      bill({ customerId: 'c1', total: 100000, paidAmount: 40000, orderDate: '2026-07-01' }),
      bill({ customerId: 'c1', total: 85000, paidAmount: 85000, orderDate: '2026-08-12' }),
      bill({ customerId: 'c2', total: 50000, paidAmount: 60000, orderDate: '2026-06-15' }),
    ]
    const out = customerFinancials(bills)

    expect(out.c1.billed).toBe(185000)
    expect(out.c1.outstanding).toBe(60000) // 60000 + 0
    expect(out.c1.lastOrderDate).toBe('2026-08-12')

    expect(out.c2.billed).toBe(50000)
    expect(out.c2.outstanding).toBe(0) // max(50000 - 60000, 0)
    expect(out.c2.lastOrderDate).toBe('2026-06-15')
  })

  it('omits customers with no bills', () => {
    const out = customerFinancials([bill({ customerId: 'c1' })])
    expect(out.c2).toBeUndefined()
    expect(Object.keys(out)).toEqual(['c1'])
  })

  it('empty input -> {}', () => {
    expect(customerFinancials([])).toEqual({})
  })
})
