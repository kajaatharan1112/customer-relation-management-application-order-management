import { renderHook } from '@testing-library/react'

const h = vi.hoisted(() => ({ bills: vi.fn(), customers: vi.fn() }))
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: h.bills }))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: h.customers }))

import { useSalesSummary } from '@/features/dashboard/queries/useSalesSummary'

const billRow = {
  id: 'b1', billNumber: 'B1', customerId: 'c1', customerName: 'Ravi',
  statusKey: 'in_progress', statusLabel: 'In progress', total: 200, paidAmount: 50,
  orderDate: '2026-09-01', deadline: null, rowsByType: { Printing: 200 },
}

describe('useSalesSummary', () => {
  it('is loading until both queries resolve', () => {
    h.bills.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    h.customers.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { result } = renderHook(() => useSalesSummary())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('composes selectors when data is present', () => {
    h.bills.mockReturnValue({ data: [billRow], isLoading: false, isError: false })
    h.customers.mockReturnValue({ data: [{ profileId: 'c1' }], isLoading: false, isError: false })
    const { result } = renderHook(() => useSalesSummary())
    expect(result.current.data?.kpis.customerCount).toBe(1)
    expect(result.current.data?.byOrderType).toEqual([{ name: 'Printing', turnover: 200 }])
    expect(result.current.data?.byMonth).toHaveLength(12)
  })

  it('surfaces error from either query', () => {
    h.bills.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    h.customers.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { result } = renderHook(() => useSalesSummary())
    expect(result.current.isError).toBe(true)
  })
})
