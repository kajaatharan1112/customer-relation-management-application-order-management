import { render, screen } from '@testing-library/react'
import { BillDetailModal } from '@/features/bills/components/BillDetailModal'

// BillDetailView pulls in a large hook tree of its own (tracking, comments,
// attachments, realtime…) that's covered by its own tests, and the
// popup-vs-mobile-page behavior lives in the shared Modal (see Modal.test.tsx).
// Here we only care that BillDetailModal wires billId/onClose into it.
vi.mock('@/features/bills/components/BillDetailView', () => ({
  BillDetailView: ({ billId, onClose }: { billId: string; onClose: () => void }) => (
    <div>
      BILL:{billId}
      <button onClick={onClose}>close</button>
    </div>
  ),
}))

describe('BillDetailModal', () => {
  it('opens the modal with the bill when billId is set', () => {
    render(<BillDetailModal billId="b1" onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('BILL:b1')).toBeInTheDocument()
  })

  it('stays closed when billId is null', () => {
    render(<BillDetailModal billId={null} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
