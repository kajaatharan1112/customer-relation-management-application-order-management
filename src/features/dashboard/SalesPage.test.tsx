import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ summary: vi.fn() }))
vi.mock('@/features/dashboard/queries/useSalesSummary', () => ({ useSalesSummary: h.summary }))
vi.mock('@/features/dashboard/components/TurnoverBarChart', () => ({
  TurnoverBarChart: ({ data }: { data: unknown[] }) => <div data-testid="chart" data-len={data.length} />,
}))
vi.mock('@/features/dashboard/components/CollectionDonut', () => ({
  CollectionDonut: ({ collected }: { collected: number }) => <div data-testid="donut">{collected}</div>,
}))

import SalesPage from '@/features/dashboard/SalesPage'

const summary = {
  kpis: {
    outstandingTotal: 412000, outstandingCount: 7, inProgressCount: 9, completedCount: 28,
    customerCount: 34, thisMonthTurnover: 940000, lastMonthTurnover: 880000, momChangePct: 7,
    ytdTurnover: 5240000, avgBillValue: 78400, collectionRate: 0.72, collectedTotal: 5680000,
    billedTotal: 7_888_889,
  },
  byDay: [{ date: '2026-09-01', turnover: 1 }, { date: '2026-09-02', turnover: 2 }, { date: '2026-09-03', turnover: 3 }],
  byMonth: [{ month: '2026-08', turnover: 1 }, { month: '2026-09', turnover: 2 }],
  byYear: [{ year: 2026, turnover: 2, ytd: true }],
  topCustomers: [{ name: 'Ravi', turnover: 1280000 }],
  byOrderType: [{ name: 'Printing', turnover: 2100000 }],
}

it('renders summary tiles, the toggled chart and breakdowns', async () => {
  h.summary.mockReturnValue({ data: summary, isLoading: false, isError: false })
  render(<SalesPage />)
  expect(screen.getByText('LKR 940k')).toBeInTheDocument()          // this-month tile
  expect(screen.getByText('72%')).toBeInTheDocument()               // collection tile
  expect(screen.getByText('Ravi')).toBeInTheDocument()              // top customers
  expect(screen.getByText('Printing')).toBeInTheDocument()          // by order type
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '2') // monthly default
  await userEvent.click(screen.getByRole('radio', { name: 'Daily' }))
  expect(screen.getByTestId('chart')).toHaveAttribute('data-len', '3')
})

it('loading + error', () => {
  h.summary.mockReturnValue({ data: undefined, isLoading: true, isError: false })
  const { rerender } = render(<SalesPage />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  h.summary.mockReturnValue({ data: undefined, isLoading: false, isError: true })
  rerender(<SalesPage />)
  expect(screen.getByText(/could not load/i)).toBeInTheDocument()
})
