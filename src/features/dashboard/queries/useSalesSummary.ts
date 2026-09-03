import { useMemo } from 'react'
import { useBills } from '@/features/bills/queries/useBills'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import {
  turnoverByDay,
  turnoverByMonth,
  turnoverByYear,
  dashboardKpis,
  topCustomersByTurnover,
  turnoverByOrderType,
} from '@/features/dashboard/dashboard.selectors'
import type { SalesSummaryVM } from '@/features/dashboard/dashboard.types'

export function useSalesSummary(): {
  data: SalesSummaryVM | undefined
  isLoading: boolean
  isError: boolean
} {
  const bills = useBills()
  const customers = useCustomers()

  const data = useMemo<SalesSummaryVM | undefined>(() => {
    if (!bills.data || !customers.data) return undefined
    const b = bills.data
    return {
      kpis: dashboardKpis(b, customers.data),
      byDay: turnoverByDay(b),
      byMonth: turnoverByMonth(b),
      byYear: turnoverByYear(b),
      topCustomers: topCustomersByTurnover(b),
      byOrderType: turnoverByOrderType(b),
    }
  }, [bills.data, customers.data])

  return {
    data,
    isLoading: bills.isLoading || customers.isLoading,
    isError: bills.isError || customers.isError,
  }
}
