import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentBillsList } from '@/features/dashboard/components/RecentBillsList'
import type { BillListItemVM } from '@/features/bills/bills.types'

const b: BillListItemVM = {
  id: 'b1', billNumber: 'BILL-42', customerId: 'c', customerName: 'Ravi',
  statusKey: 'in_progress', statusLabel: 'In progress', total: 185000, paidAmount: 0,
  orderDate: '2026-08-12', deadline: null, rowsByType: {},
}

it('renders rows and calls onOpen', async () => {
  const onOpen = vi.fn()
  render(<RecentBillsList bills={[b]} onOpen={onOpen} />)
  expect(screen.getByText('BILL-42')).toBeInTheDocument()
  expect(screen.getByText('LKR 185k')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /BILL-42/ }))
  expect(onOpen).toHaveBeenCalledWith(b)
})
