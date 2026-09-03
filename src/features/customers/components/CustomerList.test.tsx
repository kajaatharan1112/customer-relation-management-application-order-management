import { render, screen } from '@testing-library/react'
import { CustomerList } from '@/features/customers/components/CustomerList'
import type { CustomerVM } from '@/features/customers/customers.types'

const mk = (id: string): CustomerVM => ({
  profileId: id, fullName: `Name ${id}`, email: `${id}@x.lk`, phone: null,
  companyName: null, addressLine: null, city: null, notes: null, billCount: 0,
})

it('renders a card per customer + empty copy', () => {
  const { rerender } = render(<CustomerList customers={[mk('1'), mk('2')]} onEdit={() => {}} onDelete={() => {}} />)
  expect(screen.getByText('Name 1')).toBeInTheDocument()
  expect(screen.getByText('Name 2')).toBeInTheDocument()
  rerender(<CustomerList customers={[]} onEdit={() => {}} onDelete={() => {}} />)
  expect(screen.getByText(/no customers/i)).toBeInTheDocument()
})

it('passes per-customer financials through and omits the block where absent', () => {
  render(
    <CustomerList
      customers={[mk('p1'), mk('p2')]}
      onEdit={() => {}}
      onDelete={() => {}}
      financials={{ p1: { billed: 1000, outstanding: 0, lastOrderDate: '2026-09-01' } }}
    />,
  )
  expect(screen.getByText('LKR 1k')).toBeInTheDocument()
  expect(screen.getAllByText('Billed')).toHaveLength(1)
})
