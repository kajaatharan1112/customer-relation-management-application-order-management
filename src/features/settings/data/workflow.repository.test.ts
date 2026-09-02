import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  order: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: state.order.mockResolvedValue({
        data: [
          {
            id: 't1',
            name: 'Printing',
            description: null,
            is_active: true,
            workflow_stages: [
              { id: 's2', name: 'Done', sort_order: 2, color: '#000', is_final: true, deleted_at: null },
              { id: 's1', name: 'Prep', sort_order: 1, color: '#fff', is_final: false, deleted_at: null },
            ],
          },
        ],
        error: null,
      }),
    })),
    rpc: state.rpc,
  },
}))

import { workflowRepository } from '@/features/settings/data/workflow.repository'
import { supabase } from '@/core/supabase/client'

describe('workflowRepository.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps rows to camelCase VMs with stages sorted by sortOrder', async () => {
    const result = await workflowRepository.list()
    expect(result).toEqual([
      {
        id: 't1',
        name: 'Printing',
        description: null,
        isActive: true,
        stages: [
          { id: 's1', name: 'Prep', sortOrder: 1, color: '#fff', isFinal: false },
          { id: 's2', name: 'Done', sortOrder: 2, color: '#000', isFinal: true },
        ],
      },
    ])
  })
})

describe('workflowRepository.saveStages', () => {
  it('calls the replace_workflow_stages RPC with an ordered payload', async () => {
    await workflowRepository.saveStages('t1', [
      { name: 'Prep', color: '#fff', isFinal: false },
      { id: 's2', name: 'Done', color: '#000', isFinal: true },
    ])
    expect(supabase.rpc).toHaveBeenCalledWith('replace_workflow_stages', {
      p_template_id: 't1',
      p_stages: [
        { id: undefined, name: 'Prep', color: '#fff', is_final: false },
        { id: 's2', name: 'Done', color: '#000', is_final: true },
      ],
    })
  })
})
