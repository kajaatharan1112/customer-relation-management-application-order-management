import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ summary: vi.fn(), bills: vi.fn() }))
vi.mock('@/features/dashboard/queries/useSalesSummary', () => ({ useSalesSummary: h.summary }))
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: h.bills }))
vi.mock('@/features/dashboard/components/TurnoverBarChart', () => ({
  TurnoverBarChart: ({ data }: { data: unknown[] }) => <div data-testid="chart" data-len={data.length} />,
}))

import DashboardPage from '@/features/dashboard/DashboardPage'

const kpis = {
  outstandingTotal: 412000, outstandingCount: 7, inProgressCount: 9, completedCount: 28,
  customerCount: 34, thisMonthTurnover: 940000, lastMonthTurnover: 880000, momChangePct: 7,
  ytdTurnover: 5240000, avgBillValue: 78400, collectionRate: 0.72, collectedTotal: 5680000,
}
const summary = {
  kpis,
  byDay: [{ date: '2026-09-01', turnover: 1 }, { date: '2026-09-02', turnover: 2 }],
  byMonth: [{ month: '2026-08', turnover: 1 }, { month: '2026-09', turnover: 2 }],
  byYear: [{ year: 2025, turnover: 1, ytd: false }, { year: 2026, turnover: 2, ytd: true }],
  topCustomers: [], byOrderType: [],
}

beforeEach(() => {
  h.summary.mockReturnValue({ data: summary, isLoading: false, isError: false })
  h.bills.mockReturnValue({ data: [], isLoading: false, isError: false })
})

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>)

it('shows KPI values', () => {
  renderPage()
  expect(screen.getByText('LKR 412k')).toBeInTheDocument()
  const kpis = within(screen.getByTestId('kpi-cards'))
  expect(kpis.getByText('9')).toBeInTheDocument()
  expect(kpis.getByText('28')).toBeInTheDocument()
  expect(kpis.getByText('34')).toBeInTheDocument()
})

it('segmented control switches the chart dataset', async () => {
  renderPage()
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '2') // monthly default (2 pts)
  await userEvent.click(screen.getByRole('radio', { name: 'Daily' }))
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '2') // byDay also 2 pts here
  expect(screen.getByText(/daily turnover/i)).toBeInTheDocument() // heading follows the grain
})

it('renders loading + error states', () => {
  h.summary.mockReturnValue({ data: undefined, isLoading: true, isError: false })
  renderPage()
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  h.summary.mockReturnValue({ data: undefined, isLoading: false, isError: true })
  renderPage()
  expect(screen.getByText(/could not load/i)).toBeInTheDocument()
})
