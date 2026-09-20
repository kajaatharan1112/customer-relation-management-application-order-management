import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerListItem } from '@/features/customers/components/CustomerListItem'
import type { CustomerVM } from '@/features/customers/customers.types'

const base: CustomerVM = {
  profileId: 'p1', fullName: 'Ravi Kumar', email: 'ravi@x.lk', phone: '+94 77 1',
  companyName: 'Ravi Textiles', addressLine: null, city: 'Colombo', notes: null, billCount: 3,
  status: 'active',
}
const noop = () => {}

describe('CustomerListItem', () => {
  it('renders name, company and bill count', () => {
    render(<CustomerListItem customer={base} selected={false} onSelect={noop} onEdit={noop} onDelete={noop} onAddBill={noop} />)
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('Ravi Textiles')).toBeInTheDocument()
    expect(screen.getByText('3 bills')).toBeInTheDocument()
  })

  it('falls back for missing company', () => {
    render(
      <CustomerListItem
        customer={{ ...base, companyName: null }}
        selected={false}
        onSelect={noop}
        onEdit={noop}
        onDelete={noop}
        onAddBill={noop}
      />,
    )
    expect(screen.getByText('No company')).toBeInTheDocument()
  })

  it('fires onSelect when the row is clicked', async () => {
    const onSelect = vi.fn()
    render(<CustomerListItem customer={base} selected={false} onSelect={onSelect} onEdit={noop} onDelete={noop} onAddBill={noop} />)
    await userEvent.click(screen.getByText('Ravi Kumar'))
    expect(onSelect).toHaveBeenCalledWith(base)
  })

  it('opens a menu with Add bill/Edit/Block and wires them without triggering onSelect', async () => {
    const onSelect = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onAddBill = vi.fn()
    render(
      <CustomerListItem
        customer={base}
        selected={false}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddBill={onAddBill}
      />,
    )

    expect(screen.queryByRole('menuitem', { name: /edit/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /actions for ravi kumar/i }))
    expect(onSelect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('menuitem', { name: /add bill/i }))
    expect(onAddBill).toHaveBeenCalledWith(base)

    await userEvent.click(screen.getByRole('button', { name: /actions for ravi kumar/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledWith(base)

    await userEvent.click(screen.getByRole('button', { name: /actions for ravi kumar/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /block/i }))
    expect(onDelete).toHaveBeenCalledWith(base)
  })

  it('shows an outstanding badge only when finance has a balance', () => {
    const { rerender } = render(
      <CustomerListItem
        customer={base}
        selected={false}
        onSelect={noop}
        onEdit={noop}
        onDelete={noop}
        onAddBill={noop}
        finance={{ billed: 185000, outstanding: 90000, lastOrderDate: '2026-08-12' }}
      />,
    )
    expect(screen.getByText('LKR 90k')).toBeInTheDocument()

    rerender(
      <CustomerListItem
        customer={base}
        selected={false}
        onSelect={noop}
        onEdit={noop}
        onDelete={noop}
        onAddBill={noop}
        finance={{ billed: 185000, outstanding: 0, lastOrderDate: '2026-08-12' }}
      />,
    )
    expect(screen.queryByText(/LKR/)).not.toBeInTheDocument()
  })

  it('applies selected styling', () => {
    render(<CustomerListItem customer={base} selected onSelect={noop} onEdit={noop} onDelete={noop} onAddBill={noop} />)
    const row = screen.getByText('Ravi Kumar').closest('[aria-pressed]')
    expect(row).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows an Invited badge only when the customer has not verified yet', () => {
    const { rerender } = render(
      <CustomerListItem customer={base} selected={false} onSelect={noop} onEdit={noop} onDelete={noop} onAddBill={noop} />,
    )
    expect(screen.queryByText('Invited')).not.toBeInTheDocument()

    rerender(
      <CustomerListItem
        customer={{ ...base, status: 'invited' }}
        selected={false}
        onSelect={noop}
        onEdit={noop}
        onDelete={noop}
        onAddBill={noop}
      />,
    )
    expect(screen.getByText('Invited')).toBeInTheDocument()
  })
})
