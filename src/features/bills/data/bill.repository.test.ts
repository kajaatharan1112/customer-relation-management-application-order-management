import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  listOrder: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'b1',
        bill_number: 'INV-000001',
        customer_id: 'p1',
        order_date: '2026-09-01',
        deadline: null,
        paid_amount: 100,
        notes: null,
        profiles: { full_name: 'Cara', email: 'c@x.co', phone: null },
        bill_statuses: { key: 'active', label: 'Active' },
        bill_rows: [
          { id: 'r1', detail: 'A', order_type_id: 'ot1', amount: 300, deleted_at: null, current_stage_id: 's1', order_types: { name: 'Print' } },
          { id: 'r2', detail: 'B', order_type_id: null, amount: -50, deleted_at: null, current_stage_id: null, order_types: null },
        ],
      },
    ],
    error: null,
  }),
  single: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: 'b1', error: null }),
  eq: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: h.listOrder,
      single: h.single,
      update: vi.fn(() => ({ eq: h.eq })),
    })),
    rpc: h.rpc,
  },
}))

import { billRepository } from '@/features/bills/data/bill.repository'

describe('billRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows and computes total = sum of live rows', async () => {
    const r = await billRepository.list()
    expect(r[0]).toMatchObject({
      id: 'b1',
      billNumber: 'INV-000001',
      customerName: 'Cara',
      statusKey: 'active',
      statusLabel: 'Active',
      total: 250,
      paidAmount: 100,
    })
  })

  it('rolls row amounts up by order type, bucketing null names as Unassigned', async () => {
    const row = {
      id: 'b1',
      bill_number: 'BILL-1',
      customer_id: 'c1',
      order_date: '2026-08-01',
      deadline: null,
      paid_amount: 0,
      notes: null,
      profiles: { full_name: 'A', email: 'a@x.co', phone: null },
      bill_statuses: { key: 'pending', label: 'Pending' },
      bill_rows: [
        { id: 'r1', detail: 'x', order_type_id: 'o1', amount: 100, deleted_at: null, current_stage_id: null, order_types: { name: 'Printing' } },
        { id: 'r2', detail: 'y', order_type_id: 'o1', amount: 50, deleted_at: null, current_stage_id: null, order_types: { name: 'Printing' } },
        { id: 'r3', detail: 'z', order_type_id: null, amount: 25, deleted_at: null, current_stage_id: null, order_types: null },
      ],
    }
    h.listOrder.mockResolvedValueOnce({ data: [row], error: null })
    const vm = (await billRepository.list())[0]
    expect(vm.rowsByType).toEqual({ Printing: 150, Unassigned: 25 })
  })

  it('save calls save_bill with snake_case payload', async () => {
    await billRepository.save(
      { customerId: 'p1', orderDate: '2026-09-01', deadline: null, notes: 'x' },
      [
        { detail: 'A', orderTypeId: 'ot1', amount: 300 },
        { detail: 'B', orderTypeId: null, amount: -50 },
      ],
    )
    expect(h.rpc).toHaveBeenCalledWith('save_bill', {
      p_bill: { id: undefined, customer_id: 'p1', order_date: '2026-09-01', deadline: null, notes: 'x' },
      p_rows: [
        { id: undefined, detail: 'A', order_type_id: 'ot1', amount: 300 },
        { id: undefined, detail: 'B', order_type_id: null, amount: -50 },
      ],
    })
  })

  it('setStatus and softDelete call their RPCs', async () => {
    await billRepository.setStatus('b1', 'paid')
    expect(h.rpc).toHaveBeenCalledWith('set_bill_status', { p_bill_id: 'b1', p_status_key: 'paid' })
    await billRepository.softDelete('b1')
    expect(h.rpc).toHaveBeenCalledWith('soft_delete_bill', { p_bill_id: 'b1' })
  })
})
