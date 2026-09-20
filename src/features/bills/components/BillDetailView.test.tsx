import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const bill = {
  id: 'b1',
  billNumber: 'INV-000001',
  customerId: 'p1',
  customerName: 'Cara',
  customerEmail: 'c@x.co',
  customerPhone: null,
  statusKey: 'pending',
  statusLabel: 'Pending',
  total: 300,
  paidAmount: 0,
  orderDate: '2026-09-01',
  deadline: null,
  notes: null,
  rows: [
    { id: 'r1', detail: 'Banners', orderTypeId: 'ot1', orderTypeName: 'Printing', amount: 300, currentStageId: 's1' },
  ],
}

vi.mock('@/features/bills/queries/useBills', () => ({
  useBill: () => ({ data: bill, isLoading: false }),
}))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({
  useSetBillStatus: () => ({ mutateAsync: vi.fn() }),
  useRecordPayment: () => ({ mutateAsync: vi.fn() }),
  useDeleteBill: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/features/customers/queries/useCustomers', () => ({ useCustomers: () => ({ data: [] }) }))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({
  useOrderTypes: () => ({ data: [{ id: 'ot1', name: 'Printing', workflowTemplateId: 't1', workflowName: 'WF', fixedAmount: null, isActive: true }] }),
}))
vi.mock('@/features/settings/queries/useWorkflowTemplates', () => ({
  useWorkflowTemplates: () => ({
    data: [{ id: 't1', name: 'WF', description: null, isActive: true, stages: [{ id: 's1', name: 'Prep', sortOrder: 1, color: '#111', isFinal: false }] }],
  }),
}))
vi.mock('@/features/tracking/queries/useBillHistory', () => ({ useBillHistory: () => ({ data: [] }) }))
vi.mock('@/features/tracking/mutations/useAdvanceStage', () => ({ useAdvanceStage: () => ({ mutate: vi.fn() }) }))
vi.mock('@/features/comments/queries/useComments', () => ({ useComments: () => ({ data: [] }) }))
vi.mock('@/features/comments/mutations/useAddComment', () => ({ useAddComment: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/features/attachments/queries/useAttachments', () => ({ useAttachments: () => ({ data: [] }) }))
vi.mock('@/features/attachments/mutations/useAttachmentMutations', () => ({
  useUploadAttachment: () => ({ mutate: vi.fn() }),
  useRemoveAttachment: () => ({ mutate: vi.fn() }),
}))
vi.mock('@/features/realtime/useRealtimeBill', () => ({ useRealtimeBill: () => {} }))
vi.mock('@/core/auth/auth.hooks', () => ({
  useRole: () => ({ isAdmin: true, isStaff: true, isCustomer: false, profile: null, loading: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { BillDetailView } from '@/features/bills/components/BillDetailView'

describe('BillDetailView', () => {
  it('renders the tracking, messages and files sections', () => {
    render(<BillDetailView billId="b1" onClose={() => {}} />)
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText('Banners')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Files')).toBeInTheDocument()
    // tagged row renders its stepper stage
    expect(screen.getByText('Prep')).toBeInTheDocument()
    expect(screen.getByTestId('bill-balance')).toHaveTextContent(/LKR/)
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<BillDetailView billId="b1" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('opens Record payment from the top corner action row, not from the middle Actions card', async () => {
    render(<BillDetailView billId="b1" onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /record payment/i }))
    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeInTheDocument()
  })
})
