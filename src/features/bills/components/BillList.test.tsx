import { render, screen } from '@testing-library/react'
import { BillList } from '@/features/bills/components/BillList'
import type { BillListItemVM } from '@/features/bills/bills.types'

const mk = (id: string): BillListItemVM => ({
  id, billNumber: `BILL-${id}`, customerId: 'c', customerName: 'Cust',
  statusKey: 'pending', statusLabel: 'Pending', total: 1000, paidAmount: 0,
  orderDate: '2026-09-01', deadline: null, rowsByType: {},
})

describe('BillList', () => {
  it('renders a card per bill', () => {
    render(<BillList bills={[mk('1'), mk('2')]} onOpen={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('BILL-1')).toBeInTheDocument()
    expect(screen.getByText('BILL-2')).toBeInTheDocument()
  })

  it('shows empty copy when there are none', () => {
    render(<BillList bills={[]} onOpen={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/no bills/i)).toBeInTheDocument()
  })
})
