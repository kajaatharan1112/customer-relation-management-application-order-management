import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const bills = [
  {
    id: 'b1',
    billNumber: 'INV-000001',
    statusKey: 'active',
    statusLabel: 'Active',
    total: 250,
    deadline: null,
    trackedRows: 2,
    completedRows: 1,
  },
]
vi.mock('@/features/portal/queries/usePortalBills', () => ({
  usePortalBills: () => ({ data: bills, isLoading: false, isError: false }),
}))
import PortalHomePage from '@/features/portal/PortalHomePage'

describe('PortalHomePage', () => {
  it('lists the customer bills with a progress hint', () => {
    render(
      <MemoryRouter>
        <PortalHomePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()
  })
})
