export interface DayTurnover {
  date: string
  turnover: number
}

export interface MonthTurnover {
  month: string
  turnover: number
}

export interface YearTurnover {
  year: number
  turnover: number
  ytd: boolean
}

export interface NamedTurnover {
  name: string
  turnover: number
}

export interface DashboardKpisVM {
  outstandingTotal: number
  outstandingCount: number
  inProgressCount: number
  completedCount: number
  customerCount: number
  thisMonthTurnover: number
  lastMonthTurnover: number
  momChangePct: number
  ytdTurnover: number
  avgBillValue: number
  collectionRate: number
  collectedTotal: number
  billedTotal: number
}

export interface SalesSummaryVM {
  kpis: DashboardKpisVM
  byDay: DayTurnover[]
  byMonth: MonthTurnover[]
  byYear: YearTurnover[]
  topCustomers: NamedTurnover[]
  byOrderType: NamedTurnover[]
}
