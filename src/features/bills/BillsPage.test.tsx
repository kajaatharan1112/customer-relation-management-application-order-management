import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const h = vi.hoisted(() => ({ bills: vi.fn(), del: vi.fn() }))
vi.mock('@/features/bills/queries/useBills', () => ({ useBills: h.bills }))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({
  useDeleteBill: () => ({ mutateAsync: h.del }),
  useRecordPayment: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: () => ({ data: [] }) }))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({ useOrderTypes: () => ({ data: [] }) }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))
// BillDetailModal pulls in a large hook tree of its own (tracking, comments,
// attachments, realtime…) — that's covered by BillDetailView's own tests.
// Here we only need to verify BillsPage wires the route param to it.
vi.mock('@/features/bills/components/BillDetailModal', () => ({
  BillDetailModal: ({ billId }: { billId: string | null }) =>
    billId ? <div data-testid="bill-detail-modal">open:{billId}</div> : null,
}))

import BillsPage from '@/features/bills/BillsPage'

const bill = (o: Record<string, unknown>) => ({
  id: 'x', billNumber: 'B', customerId: 'c', customerName: 'C',
  statusKey: 'pending', statusLabel: 'Pending', total: 1, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...o,
})

it('filters by status chip', async () => {
  h.bills.mockReturnValue({
    data: [
      bill({ id: '1', billNumber: 'OPEN-1', statusKey: 'pending' }),
      bill({ id: '2', billNumber: 'PROG-1', statusKey: 'in_progress' }),
    ],
    isLoading: false,
    isError: false,
  })
  render(<MemoryRouter><BillsPage /></MemoryRouter>)
  expect(screen.getByText('OPEN-1')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'In progress' }))
  expect(screen.queryByText('OPEN-1')).toBeNull()
  expect(screen.getByText('PROG-1')).toBeInTheDocument()
})

it('opens the bill-detail popup from the URL and clicking the card navigates to it', async () => {
  h.bills.mockReturnValue({
    data: [bill({ id: '1', billNumber: 'OPEN-1', statusKey: 'pending' })],
    isLoading: false,
    isError: false,
  })

  const { rerender } = render(
    <MemoryRouter initialEntries={['/bills']}>
      <Routes>
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/bills/:id" element={<BillsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.queryByTestId('bill-detail-modal')).not.toBeInTheDocument()

  await userEvent.click(screen.getByText('OPEN-1'))
  expect(screen.getByTestId('bill-detail-modal')).toHaveTextContent('open:1')

  rerender(
    <MemoryRouter initialEntries={['/bills/1']}>
      <Routes>
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/bills/:id" element={<BillsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByTestId('bill-detail-modal')).toHaveTextContent('open:1')
})
