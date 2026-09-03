import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillCard } from '@/features/bills/components/BillCard'
import type { BillListItemVM } from '@/features/bills/bills.types'

const bill: BillListItemVM = {
  id: 'b1', billNumber: 'BILL-42', customerId: 'c1', customerName: 'Ravi Textiles',
  statusKey: 'in_progress', statusLabel: 'In progress', total: 185000, paidAmount: 95000,
  orderDate: '2026-08-12', deadline: '2026-08-28', rowsByType: { Printing: 185000 },
}

describe('BillCard', () => {
  it('renders identity, amounts and status', () => {
    render(<BillCard bill={bill} onOpen={() => {}} />)
    expect(screen.getByText('BILL-42')).toBeInTheDocument()
    expect(screen.getByText('Ravi Textiles')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('LKR 185,000.00')).toBeInTheDocument()
    expect(screen.getByText('LKR 90,000.00')).toBeInTheDocument() // pending = total - paid
  })

  it('View always shown; Edit/Delete only with handlers', async () => {
    const onOpen = vi.fn()
    const onEdit = vi.fn()
    render(<BillCard bill={bill} onOpen={onOpen} onEdit={onEdit} />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /view/i }))
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onOpen).toHaveBeenCalledWith(bill)
    expect(onEdit).toHaveBeenCalledWith(bill)
  })

  it('shows pending in success colour when fully paid', () => {
    render(<BillCard bill={{ ...bill, paidAmount: 185000 }} onOpen={() => {}} />)
    expect(screen.getByText('LKR 0.00')).toHaveClass('text-[var(--color-neo-success)]')
  })
})
