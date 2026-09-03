import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerCard } from '@/features/customers/components/CustomerCard'
import type { CustomerVM } from '@/features/customers/customers.types'

const base: CustomerVM = {
  profileId: 'p1', fullName: 'Ravi Kumar', email: 'ravi@x.lk', phone: '+94 77 1',
  companyName: 'Ravi Textiles', addressLine: null, city: 'Colombo', notes: null, billCount: 3,
}

describe('CustomerCard', () => {
  it('renders name, company, contact and bill count', () => {
    render(<CustomerCard customer={base} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('Ravi Textiles')).toBeInTheDocument()
    expect(screen.getByText('ravi@x.lk')).toBeInTheDocument()
    expect(screen.getByText('Colombo')).toBeInTheDocument()
    expect(screen.getByText('3 bills')).toBeInTheDocument()
  })

  it('falls back for missing company / phone', () => {
    render(<CustomerCard customer={{ ...base, companyName: null, phone: null }} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('No company')).toBeInTheDocument()
    expect(screen.getByText('No phone')).toBeInTheDocument()
  })

  it('wires actions', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<CustomerCard customer={base} onEdit={onEdit} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onEdit).toHaveBeenCalledWith(base)
    expect(onDelete).toHaveBeenCalledWith(base)
  })

  it('renders the finance block with danger styling when outstanding > 0', () => {
    render(
      <CustomerCard
        customer={base}
        onEdit={() => {}}
        onDelete={() => {}}
        finance={{ billed: 185000, outstanding: 90000, lastOrderDate: '2026-08-12' }}
      />,
    )
    expect(screen.getByText('LKR 185k')).toBeInTheDocument()
    expect(screen.getByText('LKR 90k')).toBeInTheDocument()
    expect(screen.getByText('2026-08-12')).toBeInTheDocument()
    expect(screen.getByText('LKR 90k')).toHaveClass('text-[var(--color-neo-danger)]')
  })

  it('omits danger styling when outstanding is 0', () => {
    render(
      <CustomerCard
        customer={base}
        onEdit={() => {}}
        onDelete={() => {}}
        finance={{ billed: 185000, outstanding: 0, lastOrderDate: '2026-08-12' }}
      />,
    )
    expect(screen.getByText('LKR 0')).not.toHaveClass('text-[var(--color-neo-danger)]')
  })

  it('renders no finance block without the finance prop', () => {
    render(<CustomerCard customer={base} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByText('Billed')).not.toBeInTheDocument()
    expect(screen.queryByText('Last order')).not.toBeInTheDocument()
  })
})
