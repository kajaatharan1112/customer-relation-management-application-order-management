import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const bills = [
  {
    id: 'b1',
    billNumber: 'INV-000001',
    statusKey: 'active',
    statusLabel: 'Active',
    total: 250,
    paidAmount: 100,
    orderDate: '2026-09-01',
    deadline: null,
    trackedRows: 2,
    completedRows: 1,
  },
  {
    id: 'b2',
    billNumber: 'INV-000002',
    statusKey: 'completed',
    statusLabel: 'Completed',
    total: 500,
    paidAmount: 500,
    orderDate: '2026-09-02',
    deadline: null,
    trackedRows: 1,
    completedRows: 1,
  },
]
vi.mock('@/features/portal/queries/usePortalBills', () => ({
  usePortalBills: () => ({ data: bills, isLoading: false, isError: false }),
}))
import PortalHomePage from '@/features/portal/PortalHomePage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PortalHomePage />
    </MemoryRouter>,
  )
}

describe('PortalHomePage', () => {
  it('lists the customer bills as bill cards, matching the staff bill card style', () => {
    renderPage()
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('LKR 250.00')).toBeInTheDocument() // total
    expect(screen.getByText('LKR 150.00')).toBeInTheDocument() // pending = total - paid
    // read-only for customers: no ⋮ actions menu on their own bills
    expect(screen.queryByRole('button', { name: /actions for/i })).not.toBeInTheDocument()
  })

  it('filters bills by status, same chips as the staff bills page', async () => {
    renderPage()
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText('INV-000002')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.queryByText('INV-000001')).not.toBeInTheDocument()
    expect(screen.getByText('INV-000002')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText('INV-000002')).toBeInTheDocument()
  })

  it('shows a filter-specific empty message when nothing matches', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Overdue' }))
    expect(screen.getByText('No bills match this filter.')).toBeInTheDocument()
  })
})
