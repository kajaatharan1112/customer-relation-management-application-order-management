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

  it('opens the bill when the card itself is clicked, with no View button', async () => {
    const onOpen = vi.fn()
    render(<BillCard bill={bill} onOpen={onOpen} />)
    expect(screen.queryByRole('button', { name: /view/i })).toBeNull()
    await userEvent.click(screen.getByText('BILL-42'))
    expect(onOpen).toHaveBeenCalledWith(bill)
  })

  it('shows no actions menu without an onDelete handler', () => {
    render(<BillCard bill={bill} onOpen={() => {}} />)
    expect(screen.queryByRole('button', { name: /actions for/i })).toBeNull()
  })

  it('opens a menu with Delete when onDelete is provided, without triggering onOpen', async () => {
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    render(<BillCard bill={bill} onOpen={onOpen} onDelete={onDelete} />)

    expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /actions for bill-42/i }))
    expect(onOpen).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith(bill)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('opens a menu with Record payment when onRecordPayment is provided, without triggering onOpen', async () => {
    const onOpen = vi.fn()
    const onRecordPayment = vi.fn()
    render(<BillCard bill={bill} onOpen={onOpen} onRecordPayment={onRecordPayment} />)

    await userEvent.click(screen.getByRole('button', { name: /actions for bill-42/i }))
    expect(onOpen).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('menuitem', { name: /record payment/i }))
    expect(onRecordPayment).toHaveBeenCalledWith(bill)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('lists Record payment before Delete when both handlers are provided', async () => {
    render(<BillCard bill={bill} onOpen={() => {}} onDelete={() => {}} onRecordPayment={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /actions for bill-42/i }))
    const items = screen.getAllByRole('menuitem').map((el) => el.textContent)
    expect(items).toEqual(['Record payment', 'Delete'])
  })

  it('shows pending in success colour when fully paid', () => {
    render(<BillCard bill={{ ...bill, paidAmount: 185000 }} onOpen={() => {}} />)
    expect(screen.getByText('LKR 0.00')).toHaveClass('text-[var(--color-neo-success)]')
  })
})
