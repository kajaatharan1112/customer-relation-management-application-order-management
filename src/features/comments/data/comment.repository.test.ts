import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'c1',
        body: 'hi',
        created_at: '2026-09-02T10:00:00Z',
        author_id: 'u1',
        profiles: { full_name: 'Ava', user_types: { key: 'admin_member' } },
      },
      {
        id: 'c2',
        body: 'thanks',
        created_at: '2026-09-02T11:00:00Z',
        author_id: 'u2',
        profiles: { full_name: 'Cara', user_types: { key: 'customer' } },
      },
    ],
    error: null,
  }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      insert: h.insert,
    })),
    auth: { getUser: h.getUser },
  },
}))
import { commentRepository } from '@/features/comments/data/comment.repository'

describe('commentRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows and staff flag', async () => {
    const r = await commentRepository.list('b1')
    expect(r).toEqual([
      { id: 'c1', authorName: 'Ava', authorIsStaff: true, body: 'hi', createdAt: '2026-09-02T10:00:00Z' },
      { id: 'c2', authorName: 'Cara', authorIsStaff: false, body: 'thanks', createdAt: '2026-09-02T11:00:00Z' },
    ])
  })

  it('add inserts with the current user as author', async () => {
    await commentRepository.add('b1', 'new comment')
    expect(h.insert).toHaveBeenCalledWith({ bill_id: 'b1', author_id: 'u1', body: 'new comment' })
  })
})
