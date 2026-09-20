import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerProfileModal } from '@/features/customers/components/CustomerProfileModal'
import type { CustomerVM } from '@/features/customers/customers.types'

const h = vi.hoisted(() => ({ update: vi.fn(), del: vi.fn() }))
vi.mock('@/features/customers/mutations/useCustomerMutations', () => ({
  useUpdateCustomer: () => ({ mutateAsync: h.update, isPending: false }),
  useDeleteCustomer: () => ({ mutateAsync: h.del }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

const base: CustomerVM = {
  profileId: 'p1', fullName: 'Ravi Kumar', email: 'ravi@x.lk', phone: '+94 77 1',
  companyName: 'Ravi Textiles', addressLine: null, city: 'Colombo', notes: null, billCount: 0,
  status: 'active',
}

function setMobile(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

beforeEach(() => {
  h.update.mockReset().mockResolvedValue(undefined)
  h.del.mockReset().mockResolvedValue(undefined)
  setMobile(false)
})

describe('CustomerProfileModal', () => {
  it('shows the customer details and no Save button until something changes', () => {
    render(<CustomerProfileModal customer={base} onClose={() => {}} />)
    expect(screen.getByDisplayValue('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ravi Textiles')).toBeInTheDocument()
    expect(screen.getByText('ravi@x.lk')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('reveals Save once a field is edited, and saves on click', async () => {
    const onClose = vi.fn()
    render(<CustomerProfileModal customer={base} onClose={onClose} />)

    await userEvent.type(screen.getByDisplayValue('Ravi Textiles'), ' Ltd')
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeInTheDocument()

    await userEvent.click(save)
    expect(h.update).toHaveBeenCalledWith({
      profileId: 'p1',
      input: expect.objectContaining({ companyName: 'Ravi Textiles Ltd' }),
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('blocks a customer with bills from being blocked, and blocks one without', async () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <CustomerProfileModal customer={{ ...base, billCount: 2 }} onClose={onClose} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /block customer/i }))
    expect(screen.getByText(/has 2 active bill/i)).toBeInTheDocument()
    expect(h.del).not.toHaveBeenCalled()

    rerender(<CustomerProfileModal customer={base} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /block customer/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Block' }))
    expect(h.del).toHaveBeenCalledWith('p1')
    expect(onClose).toHaveBeenCalled()
  })

  it('still renders the same fields on mobile (Modal itself handles the page-vs-popup switch)', () => {
    setMobile(true)
    render(<CustomerProfileModal customer={base} onClose={() => {}} />)
    expect(screen.getByDisplayValue('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('ravi@x.lk')).toBeInTheDocument()
  })
})
