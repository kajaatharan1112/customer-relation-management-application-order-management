import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerList } from '@/features/customers/components/CustomerList'
import type { CustomerVM } from '@/features/customers/customers.types'

const mk = (id: string): CustomerVM => ({
  profileId: id, fullName: `Name ${id}`, email: `${id}@x.lk`, phone: null,
  companyName: null, addressLine: null, city: null, notes: null, billCount: 0, status: 'active',
})

it('renders a row per customer + empty copy', () => {
  const { rerender } = render(
    <CustomerList customers={[mk('1'), mk('2')]} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} onAddBill={() => {}} />,
  )
  expect(screen.getByText('Name 1')).toBeInTheDocument()
  expect(screen.getByText('Name 2')).toBeInTheDocument()
  rerender(<CustomerList customers={[]} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} onAddBill={() => {}} />)
  expect(screen.getByText(/no customers/i)).toBeInTheDocument()
})

it('marks the selected row and fires onSelect', async () => {
  const onSelect = vi.fn()
  render(
    <CustomerList customers={[mk('p1'), mk('p2')]} selectedId="p2" onSelect={onSelect} onEdit={() => {}} onDelete={() => {}} onAddBill={() => {}} />,
  )
  expect(screen.getByText('Name p2').closest('[aria-pressed]')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Name p1').closest('[aria-pressed]')).toHaveAttribute('aria-pressed', 'false')

  await userEvent.click(screen.getByText('Name p1'))
  expect(onSelect).toHaveBeenCalledWith(mk('p1'))
})

it('passes per-customer financials through', () => {
  render(
    <CustomerList
      customers={[mk('p1'), mk('p2')]}
      onSelect={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      onAddBill={() => {}}
      financials={{ p1: { billed: 1000, outstanding: 500, lastOrderDate: '2026-09-01' } }}
    />,
  )
  expect(screen.getByText('LKR 500')).toBeInTheDocument()
})
