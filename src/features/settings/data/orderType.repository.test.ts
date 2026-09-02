import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'ot1',
        name: 'Paper Printing',
        workflow_template_id: 't1',
        fixed_amount: 500,
        is_active: true,
        workflow_templates: { name: 'Printing' },
      },
    ],
    error: null,
  }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: state.order,
      upsert: state.upsert,
    })),
    rpc: state.rpc,
  },
}))

import { orderTypeRepository } from '@/features/settings/data/orderType.repository'

describe('orderTypeRepository.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps rows and joins the workflow name', async () => {
    const result = await orderTypeRepository.list()
    expect(result).toEqual([
      {
        id: 'ot1',
        name: 'Paper Printing',
        workflowTemplateId: 't1',
        workflowName: 'Printing',
        fixedAmount: 500,
        isActive: true,
      },
    ])
  })
})

describe('orderTypeRepository.softDelete', () => {
  it('calls the soft_delete_order_type RPC', async () => {
    await orderTypeRepository.softDelete('ot1')
    expect(state.rpc).toHaveBeenCalledWith('soft_delete_order_type', { p_order_type_id: 'ot1' })
  })
})
