import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const bills = [
  {
    id: 'b1',
    billNumber: 'INV-000001',
    customerId: 'p1',
    customerName: 'Cara',
    statusKey: 'pending',
    statusLabel: 'Pending',
    total: 300,
    paidAmount: 0,
    orderDate: '2026-09-01',
    deadline: null,
  },
  {
    id: 'b2',
    billNumber: 'INV-000002',
    customerId: 'p2',
    customerName: 'Bob',
    statusKey: 'paid',
    statusLabel: 'Paid',
    total: 100,
    paidAmount: 100,
    orderDate: '2026-09-02',
    deadline: null,
  },
]
vi.mock('@/features/bills/queries/useBills', () => ({
  useBills: () => ({ data: bills, isLoading: false, isError: false }),
}))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({
  useDeleteBill: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: () => ({ data: [] }) }))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({ useOrderTypes: () => ({ data: [] }) }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import BillsPage from '@/features/bills/BillsPage'

describe('BillsPage', () => {
  it('lists bills and filters by search', async () => {
    render(
      <MemoryRouter>
        <BillsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'INV-000002')
    expect(screen.queryByText('INV-000001')).not.toBeInTheDocument()
    expect(screen.getByText('INV-000002')).toBeInTheDocument()
  })
})
