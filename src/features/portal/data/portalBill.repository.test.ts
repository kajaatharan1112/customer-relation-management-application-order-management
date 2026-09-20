import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'b1',
        bill_number: 'INV-000001',
        order_date: '2026-09-01',
        deadline: null,
        paid_amount: 100,
        bill_statuses: { key: 'active', label: 'Active' },
        bill_rows: [
          { amount: 300, deleted_at: null, order_type_id: 'ot1', workflow_stages: { is_final: true } },
          { amount: -50, deleted_at: null, order_type_id: 'ot2', workflow_stages: { is_final: false } },
        ],
      },
    ],
    error: null,
  }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: h.order })),
    auth: { getUser: h.getUser },
  },
}))
vi.mock('@/features/bills/data/bill.repository', () => ({
  billRepository: { get: vi.fn().mockResolvedValue({ id: 'b1', customerId: 'me' }) },
}))
import { portalBillRepository } from '@/features/portal/data/portalBill.repository'
import { billRepository } from '@/features/bills/data/bill.repository'

describe('portalBillRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows with total and stage summary', async () => {
    const r = await portalBillRepository.list()
    expect(r[0]).toEqual({
      id: 'b1',
      billNumber: 'INV-000001',
      statusKey: 'active',
      statusLabel: 'Active',
      total: 250,
      paidAmount: 100,
      orderDate: '2026-09-01',
      deadline: null,
      trackedRows: 2,
      completedRows: 1,
    })
  })

  it('get returns the bill when it belongs to the signed-in user', async () => {
    expect(await portalBillRepository.get('b1')).toMatchObject({ id: 'b1' })
  })

  it("get returns null when the bill is someone else's", async () => {
    ;(billRepository.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'b2',
      customerId: 'other',
    })
    expect(await portalBillRepository.get('b2')).toBeNull()
  })
})
