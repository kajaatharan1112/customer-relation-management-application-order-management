import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const bill = {
  id: 'b1',
  billNumber: 'INV-000001',
  customerId: 'me',
  customerName: 'Cara',
  customerEmail: 'c@x.co',
  customerPhone: null,
  statusKey: 'active',
  statusLabel: 'Active',
  total: 300,
  paidAmount: 0,
  orderDate: '2026-09-01',
  deadline: null,
  notes: null,
  rows: [
    { id: 'r1', detail: 'Banners', orderTypeId: 'ot1', orderTypeName: 'Printing', amount: 300, currentStageId: 's1' },
  ],
}

const mockPortalBill = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('@/features/portal/queries/usePortalBills', () => ({
  usePortalBill: () => ({ data: mockPortalBill.value, isLoading: false }),
}))
vi.mock('@/features/settings/queries/useWorkflowTemplates', () => ({
  useWorkflowTemplates: () => ({
    data: [{ id: 't1', name: 'WF', description: null, isActive: true, stages: [{ id: 's1', name: 'Prep', sortOrder: 1, color: '#111', isFinal: false }] }],
  }),
}))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({
  useOrderTypes: () => ({ data: [{ id: 'ot1', name: 'Printing', workflowTemplateId: 't1', workflowName: 'WF', fixedAmount: null, isActive: true }] }),
}))
vi.mock('@/features/tracking/queries/useBillHistory', () => ({ useBillHistory: () => ({ data: [] }) }))
vi.mock('@/features/comments/queries/useComments', () => ({ useComments: () => ({ data: [] }) }))
vi.mock('@/features/comments/mutations/useAddComment', () => ({ useAddComment: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/features/attachments/queries/useAttachments', () => ({ useAttachments: () => ({ data: [] }) }))
vi.mock('@/features/realtime/useRealtimeBill', () => ({ useRealtimeBill: () => {} }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import PortalBillPage from '@/features/portal/PortalBillPage'

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/portal/bills/b1']}>
      <Routes>
        <Route path="/portal/bills/:id" element={<PortalBillPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalBillPage', () => {
  it('renders the read-only bill with progress, messages and files', () => {
    mockPortalBill.value = bill
    renderAt()
    expect(screen.getByText('INV-000001')).toBeInTheDocument()
    expect(screen.getByText('Banners')).toBeInTheDocument()
    expect(screen.getByText('Prep')).toBeInTheDocument()
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Files')).toBeInTheDocument()
    // read-only: stepper renders no buttons, no upload input
    expect(screen.queryByLabelText(/upload a file/i)).not.toBeInTheDocument()
  })

  it('shows "not found" when the bill does not resolve', () => {
    mockPortalBill.value = null
    renderAt()
    expect(screen.getByText(/bill not found/i)).toBeInTheDocument()
  })
})
