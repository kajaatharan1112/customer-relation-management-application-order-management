import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'a1',
        file_name: 'proof.pdf',
        size_bytes: 2048,
        storage_path: 'bill/b1/uuid-proof.pdf',
        created_at: '2026-09-02T10:00:00Z',
        profiles: { full_name: 'Ava' },
      },
    ],
    error: null,
  }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  updateEq: vi.fn().mockResolvedValue({ error: null }),
  stUpload: vi.fn().mockResolvedValue({ error: null }),
  stSigned: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://x/y' }, error: null }),
  stRemove: vi.fn().mockResolvedValue({ error: null }),
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
      update: vi.fn(() => ({ eq: h.updateEq })),
    })),
    storage: {
      from: vi.fn(() => ({ upload: h.stUpload, createSignedUrl: h.stSigned, remove: h.stRemove })),
    },
    auth: { getUser: h.getUser },
  },
}))
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'

describe('attachmentRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows', async () => {
    const r = await attachmentRepository.list('b1')
    expect(r).toEqual([
      {
        id: 'a1',
        fileName: 'proof.pdf',
        sizeBytes: 2048,
        storagePath: 'bill/b1/uuid-proof.pdf',
        uploadedByName: 'Ava',
        createdAt: '2026-09-02T10:00:00Z',
      },
    ])
  })

  it('signedUrl returns the url', async () => {
    expect(await attachmentRepository.signedUrl('bill/b1/x.pdf')).toBe('https://x/y')
    expect(h.stSigned).toHaveBeenCalledWith('bill/b1/x.pdf', 60)
  })

  it('remove deletes the object then soft-deletes the row', async () => {
    await attachmentRepository.remove('a1', 'bill/b1/x.pdf')
    expect(h.stRemove).toHaveBeenCalledWith(['bill/b1/x.pdf'])
    expect(h.updateEq).toHaveBeenCalledWith('id', 'a1')
  })
})
