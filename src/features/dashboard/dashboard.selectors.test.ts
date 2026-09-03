import {
  dashboardKpis,
  topCustomersByTurnover,
  turnoverByDay,
  turnoverByMonth,
  turnoverByOrderType,
  turnoverByYear,
} from '@/features/dashboard/dashboard.selectors'
import type { BillListItemVM } from '@/features/bills/bills.types'
import type { CustomerVM } from '@/features/customers/customers.types'

const bill = (over: Partial<BillListItemVM>): BillListItemVM => ({
  id: 'x', billNumber: 'B', customerId: 'c', customerName: 'C',
  statusKey: 'pending', statusLabel: 'Pending', total: 0, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...over,
})

const today = new Date('2026-09-02T12:00:00')

describe('time-bucket selectors', () => {
  it('turnoverByDay: zero-filled window ending today, newest last', () => {
    const out = turnoverByDay(
      [bill({ orderDate: '2026-09-02', total: 30 }), bill({ orderDate: '2026-09-01', total: 10 }), bill({ orderDate: '2026-08-20', total: 999 })],
      3,
      today,
    )
    expect(out).toEqual([
      { date: '2026-08-31', turnover: 0 },
      { date: '2026-09-01', turnover: 10 },
      { date: '2026-09-02', turnover: 30 },
    ])
  })

  it('turnoverByMonth: last N months, zero-filled', () => {
    const out = turnoverByMonth([bill({ orderDate: '2026-09-15', total: 5 }), bill({ orderDate: '2026-08-01', total: 7 })], 3, today)
    expect(out).toEqual([
      { month: '2026-07', turnover: 0 },
      { month: '2026-08', turnover: 7 },
      { month: '2026-09', turnover: 5 },
    ])
  })

  it('turnoverByYear: earliest order year..current, current flagged ytd', () => {
    const out = turnoverByYear([bill({ orderDate: '2024-03-01', total: 100 }), bill({ orderDate: '2026-01-01', total: 40 })], today)
    expect(out).toEqual([
      { year: 2024, turnover: 100, ytd: false },
      { year: 2025, turnover: 0, ytd: false },
      { year: 2026, turnover: 40, ytd: true },
    ])
  })

  it('empty input never yields NaN', () => {
    expect(turnoverByDay([], 2, today)).toEqual([
      { date: '2026-09-01', turnover: 0 },
      { date: '2026-09-02', turnover: 0 },
    ])
    expect(turnoverByYear([], today)).toEqual([{ year: 2026, turnover: 0, ytd: true }])
  })
})

describe('kpi + ranking selectors', () => {
  const t = new Date('2026-09-02T12:00:00')
  const b = (o: Partial<BillListItemVM>): BillListItemVM => ({
    id: 'x', billNumber: 'B', customerId: 'c', customerName: 'C',
    statusKey: 'pending', statusLabel: 'Pending', total: 0, paidAmount: 0,
    orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...o,
  })

  it('dashboardKpis: outstanding, counts, MoM, avg, collection', () => {
    const bills = [
      b({ statusKey: 'pending', total: 100, paidAmount: 0, orderDate: '2026-09-01' }),
      b({ statusKey: 'in_progress', total: 200, paidAmount: 50, orderDate: '2026-09-10' }),
      b({ statusKey: 'completed', total: 300, paidAmount: 300, orderDate: '2026-08-15' }),
    ]
    const customers = [{ profileId: 'c1' } as CustomerVM, { profileId: 'c2' } as CustomerVM]
    const k = dashboardKpis(bills, customers, t)
    expect(k.outstandingTotal).toBe(250)        // 100 + 150
    expect(k.outstandingCount).toBe(2)
    expect(k.inProgressCount).toBe(1)
    expect(k.completedCount).toBe(1)
    expect(k.customerCount).toBe(2)
    expect(k.thisMonthTurnover).toBe(300)       // Sep: 100 + 200
    expect(k.lastMonthTurnover).toBe(300)       // Aug: 300
    expect(k.momChangePct).toBe(0)
    expect(k.ytdTurnover).toBe(600)
    expect(k.avgBillValue).toBe(200)
    expect(k.collectionRate).toBeCloseTo(350 / 600)
    expect(k.collectedTotal).toBe(350)
    expect(k.billedTotal).toBe(600)
  })

  it('dashboardKpis: empty -> all zeros, no NaN', () => {
    const k = dashboardKpis([], [], t)
    expect(k.avgBillValue).toBe(0)
    expect(k.collectionRate).toBe(0)
    expect(k.momChangePct).toBe(0)
    expect(k.billedTotal).toBe(0)
  })

  it('topCustomersByTurnover: grouped, desc, capped', () => {
    const out = topCustomersByTurnover(
      [b({ customerName: 'A', total: 100 }), b({ customerName: 'B', total: 300 }), b({ customerName: 'A', total: 50 })],
      2,
    )
    expect(out).toEqual([{ name: 'B', turnover: 300 }, { name: 'A', turnover: 150 }])
  })

  it('turnoverByOrderType: summed across bills, desc', () => {
    const out = turnoverByOrderType([
      b({ rowsByType: { Printing: 100, Design: 40 } }),
      b({ rowsByType: { Printing: 60, Unassigned: 25 } }),
    ])
    expect(out).toEqual([
      { name: 'Printing', turnover: 160 },
      { name: 'Design', turnover: 40 },
      { name: 'Unassigned', turnover: 25 },
    ])
  })
})
