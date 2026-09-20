import { describe, it, expect, vi, beforeEach } from 'vitest'
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
const bill = (o: Record<string, unknown>) => ({
  id: 'x', billNumber: 'B', customerId: 'p1', customerName: 'C',
  statusKey: 'pending', statusLabel: 'Pending', total: 1, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {}, ...o,
})

const h = vi.hoisted(() => ({ bills: vi.fn() }))
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
  useBills: h.bills,
  useBill: () => ({ data: undefined, isLoading: false }),
}))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({ useOrderTypes: () => ({ data: [] }) }))
vi.mock('@/features/bills/components/BillFormModal', () => ({
  BillFormModal: ({ defaultCustomerId }: { defaultCustomerId?: string }) => (
    <div data-testid="bill-form-modal" data-customer={defaultCustomerId} />
  ),
}))

import CustomersPage from '@/features/customers/CustomersPage'

function setMobile(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

beforeEach(() => {
  h.bills.mockReturnValue({ data: [], isLoading: false, isError: false })
  setMobile(false)
})

describe('CustomersPage', () => {
  it('lists customers and filters by search', async () => {
    render(<CustomersPage />)
    // Cara Co is auto-selected, so it shows up in both the list row and the
    // right-pane header — scope on the list row's unique "Actions for" control.
    expect(screen.getByRole('button', { name: 'Actions for Cara Co' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions for Bob Bee' })).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'bob')
    expect(screen.queryByRole('button', { name: 'Actions for Cara Co' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions for Bob Bee' })).toBeInTheDocument()
  })

  it('renders the customer summary strip', () => {
    render(<CustomersPage />)
    const strip = screen.getByTestId('customer-summary')
    expect(strip).toBeInTheDocument()
    expect(within(strip).getByText('Customers')).toBeInTheDocument()
  })

  it('auto-selects the first customer and shows an empty-bills message in the right pane', () => {
    render(<CustomersPage />)
    expect(screen.queryByText('Select a customer to view their bills.')).not.toBeInTheDocument()
    expect(screen.getByText('No bills yet for this customer.')).toBeInTheDocument()
  })

  it('blocks the Block action for a customer with bills (no confirm button in the dialog)', async () => {
    render(<CustomersPage />)
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'bob')
    await userEvent.click(screen.getByRole('button', { name: /actions for bob bee/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /block/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/has 3 active bill/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /block/i })).not.toBeInTheDocument()
  })

  it('defaults the bill filter to In progress and switching to All shows every bill', async () => {
    h.bills.mockReturnValue({
      data: [
        bill({ id: 'b1', billNumber: 'OPEN-1', statusKey: 'pending' }),
        bill({ id: 'b2', billNumber: 'PROG-1', statusKey: 'in_progress' }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<CustomersPage />)
    expect(screen.getByRole('button', { name: 'In progress' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('PROG-1')).toBeInTheDocument()
    expect(screen.queryByText('OPEN-1')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('OPEN-1')).toBeInTheDocument()
    expect(screen.getByText('PROG-1')).toBeInTheDocument()
  })

  it('opens the create-bill form pre-selected for the customer from its ⋮ menu', async () => {
    render(<CustomersPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Bob Bee' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /add bill/i }))
    expect(screen.getByTestId('bill-form-modal')).toHaveAttribute('data-customer', 'p2')
  })

  it('on mobile, shows only the list until a customer is selected, then only the detail screen', async () => {
    setMobile(true)
    render(<CustomersPage />)

    expect(screen.getByTestId('customers-list-pane')).not.toHaveClass('hidden')
    expect(screen.getByTestId('customers-detail-pane')).toHaveClass('hidden')

    await userEvent.click(screen.getByText('Bob Bee'))

    expect(screen.getByTestId('customers-list-pane')).toHaveClass('hidden')
    expect(screen.getByTestId('customers-detail-pane')).not.toHaveClass('hidden')
  })

  it('both panes always carry the md:flex override, so desktop shows them regardless of the mobile screen state', () => {
    render(<CustomersPage />)
    expect(screen.getByTestId('customers-list-pane')).toHaveClass('md:flex')
    expect(screen.getByTestId('customers-detail-pane')).toHaveClass('md:flex')
  })
})
