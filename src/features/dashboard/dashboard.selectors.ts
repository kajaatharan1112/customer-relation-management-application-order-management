import { bucketOf } from '@/shared/constants/billStatus'
import type { BillListItemVM } from '@/features/bills/bills.types'
import type { CustomerVM } from '@/features/customers/customers.types'
import type {
  DashboardKpisVM,
  DayTurnover,
  MonthTurnover,
  NamedTurnover,
  YearTurnover,
} from '@/features/dashboard/dashboard.types'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function turnoverByDay(bills: BillListItemVM[], days = 14, today: Date = new Date()): DayTurnover[] {
  const buckets = new Map<string, number>()
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const k = ymd(d)
    keys.push(k)
    buckets.set(k, 0)
  }
  for (const b of bills) {
    const k = b.orderDate.slice(0, 10)
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + b.total)
  }
  return keys.map((date) => ({ date, turnover: buckets.get(date)! }))
}

export function turnoverByMonth(bills: BillListItemVM[], months = 12, today: Date = new Date()): MonthTurnover[] {
  const buckets = new Map<string, number>()
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const k = ym(d)
    keys.push(k)
    buckets.set(k, 0)
  }
  for (const b of bills) {
    const k = b.orderDate.slice(0, 7)
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + b.total)
  }
  return keys.map((month) => ({ month, turnover: buckets.get(month)! }))
}

export function turnoverByYear(bills: BillListItemVM[], today: Date = new Date()): YearTurnover[] {
  const currentYear = today.getFullYear()
  const earliest = bills.reduce((min, b) => {
    const y = Number(b.orderDate.slice(0, 4))
    return Number.isFinite(y) && y < min ? y : min
  }, currentYear)
  const out: YearTurnover[] = []
  for (let y = earliest; y <= currentYear; y++) {
    const turnover = bills
      .filter((b) => Number(b.orderDate.slice(0, 4)) === y)
      .reduce((s, b) => s + b.total, 0)
    out.push({ year: y, turnover, ytd: y === currentYear })
  }
  return out
}

export function dashboardKpis(
  bills: BillListItemVM[],
  customers: CustomerVM[],
  today: Date = new Date(),
): DashboardKpisVM {
  const thisMonth = ym(today)
  const lastMonth = ym(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  const thisYear = String(today.getFullYear())

  let outstandingTotal = 0
  let outstandingCount = 0
  let inProgressCount = 0
  let completedCount = 0
  let thisMonthTurnover = 0
  let lastMonthTurnover = 0
  let ytdTurnover = 0
  let sumTotal = 0
  let sumPaid = 0

  for (const bill of bills) {
    const bucket = bucketOf(bill.statusKey)
    const pending = bill.total - bill.paidAmount
    if (bucket !== 'done' && pending > 0) {
      outstandingTotal += pending
      outstandingCount++
    }
    if (bucket === 'active') inProgressCount++
    if (bucket === 'done') completedCount++
    const mk = bill.orderDate.slice(0, 7)
    if (mk === thisMonth) thisMonthTurnover += bill.total
    if (mk === lastMonth) lastMonthTurnover += bill.total
    if (bill.orderDate.slice(0, 4) === thisYear) ytdTurnover += bill.total
    sumTotal += bill.total
    sumPaid += bill.paidAmount
  }

  const momChangePct =
    lastMonthTurnover === 0
      ? thisMonthTurnover === 0
        ? 0
        : 100
      : ((thisMonthTurnover - lastMonthTurnover) / lastMonthTurnover) * 100

  return {
    outstandingTotal,
    outstandingCount,
    inProgressCount,
    completedCount,
    customerCount: customers.length,
    thisMonthTurnover,
    lastMonthTurnover,
    momChangePct,
    ytdTurnover,
    avgBillValue: bills.length === 0 ? 0 : sumTotal / bills.length,
    collectionRate: sumTotal === 0 ? 0 : sumPaid / sumTotal,
    collectedTotal: sumPaid,
    billedTotal: sumTotal,
  }
}

export function topCustomersByTurnover(bills: BillListItemVM[], n = 5): NamedTurnover[] {
  const map = new Map<string, number>()
  for (const b of bills) map.set(b.customerName, (map.get(b.customerName) ?? 0) + b.total)
  return [...map.entries()]
    .map(([name, turnover]) => ({ name, turnover }))
    .sort((a, b) => b.turnover - a.turnover)
    .slice(0, n)
}

export function turnoverByOrderType(bills: BillListItemVM[]): NamedTurnover[] {
  const map = new Map<string, number>()
  for (const b of bills) {
    for (const [type, amount] of Object.entries(b.rowsByType)) {
      map.set(type, (map.get(type) ?? 0) + amount)
    }
  }
  return [...map.entries()]
    .map(([name, turnover]) => ({ name, turnover }))
    .sort((a, b) => b.turnover - a.turnover)
}
