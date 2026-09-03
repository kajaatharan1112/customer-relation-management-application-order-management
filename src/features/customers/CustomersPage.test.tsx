import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const rows = [
  {
    profileId: 'p1',
    fullName: 'Cara Co',
    email: 'cara@x.co',
    phone: null,
    companyName: 'Acme',
    addressLine: null,
    city: null,
    notes: null,
    billCount: 0,
  },
  {
    profileId: 'p2',
    fullName: 'Bob Bee',
    email: 'bob@x.co',
    phone: null,
    companyName: null,
    addressLine: null,
    city: null,
    notes: null,
    billCount: 3,
  },
]
vi.mock('@/features/customers/queries/useCustomers', () => ({
  useCustomers: () => ({ data: rows, isLoading: false, isError: false }),
}))
vi.mock('@/features/customers/mutations/useCustomerMutations', () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCustomer: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))
vi.mock('@/features/bills/queries/useBills', () => ({
  useBills: () => ({ data: [], isLoading: false, isError: false }),
}))

import CustomersPage from '@/features/customers/CustomersPage'

describe('CustomersPage', () => {
  it('lists customers and filters by search', async () => {
    render(<CustomersPage />)
    expect(screen.getByText('Cara Co')).toBeInTheDocument()
    expect(screen.getByText('Bob Bee')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'bob')
    expect(screen.queryByText('Cara Co')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Bee')).toBeInTheDocument()
  })

  it('renders the customer summary strip', () => {
    render(<CustomersPage />)
    const strip = screen.getByTestId('customer-summary')
    expect(strip).toBeInTheDocument()
    expect(within(strip).getByText('Customers')).toBeInTheDocument()
  })

  it('blocks delete for a customer with bills (no confirm button in the dialog)', async () => {
    render(<CustomersPage />)
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'bob')
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/has 3 active bill/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})
