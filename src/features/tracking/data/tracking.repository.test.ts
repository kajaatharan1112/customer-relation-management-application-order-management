import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'h1',
        bill_id: 'b1',
        bill_row_id: 'r1',
        row_detail: 'Banners',
        from_stage: 'Prep',
        to_stage: 'Typing',
        note: 'go',
        created_at: '2026-09-02T10:00:00Z',
        changed_by_name: 'Ava',
      },
    ],
    error: null,
  }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: h.order,
    })),
    rpc: h.rpc,
  },
}))
import { trackingRepository } from '@/features/tracking/data/tracking.repository'

describe('trackingRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listHistory maps rows', async () => {
    const r = await trackingRepository.listHistory('b1')
    expect(r).toEqual([
      {
        id: 'h1',
        rowDetail: 'Banners',
        fromStage: 'Prep',
        toStage: 'Typing',
        note: 'go',
        changedByName: 'Ava',
        createdAt: '2026-09-02T10:00:00Z',
      },
    ])
  })

  it('advanceStage calls the rpc', async () => {
    await trackingRepository.advanceStage('r1', 's2', 'note')
    expect(h.rpc).toHaveBeenCalledWith('advance_bill_row_stage', {
      p_row_id: 'r1',
      p_to_stage_id: 's2',
      p_note: 'note',
    })
  })
})
