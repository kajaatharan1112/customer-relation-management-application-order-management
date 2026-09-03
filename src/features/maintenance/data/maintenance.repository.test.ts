import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  insertSingle: vi.fn(),
  remove: vi.fn().mockResolvedValue({ data: [], error: null }),
  download: vi.fn().mockResolvedValue({ data: new Blob(['x']), error: null }),
  billsResult: vi.fn().mockResolvedValue({ data: [], error: null }),
  attsResult: vi.fn().mockResolvedValue({ data: [], error: null }),
}))

vi.mock('@/core/supabase/client', () => {
  const billsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: (...a: unknown[]) => h.billsResult(...a),
  }
  const attsChain = {
    select: vi.fn().mockReturnThis(),
    or: (...a: unknown[]) => h.attsResult(...a),
  }
  return {
    supabase: {
      rpc: h.rpc,
      from: vi.fn((table: string) => {
        if (table === 'export_tokens') {
          return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: h.insertSingle })) })) }
        }
        if (table === 'attachments') return attsChain
        return billsChain
      }),
      storage: { from: vi.fn(() => ({ remove: h.remove, download: h.download })) },
    },
  }
})

import { maintenanceRepository } from '@/features/maintenance/data/maintenance.repository'

const STATS_JSON = {
  total: { bills: 5, billRows: 9, comments: 3, attachments: 4, storageBytes: 8192 },
  eligible: { bills: 2, billRows: 3, comments: 1, attachments: 1, storageBytes: 2048 },
}

describe('maintenanceRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stats maps the jsonb into a VM', async () => {
    h.rpc.mockResolvedValue({ data: STATS_JSON, error: null })
    const vm = await maintenanceRepository.stats('2025-09-03')
    expect(h.rpc).toHaveBeenCalledWith('maintenance_stats', { p_before: '2025-09-03' })
    expect(vm.cutoff).toBe('2025-09-03')
    expect(vm.total.bills).toBe(5)
    expect(vm.eligible.storageBytes).toBe(2048)
  })

  it('recordExport inserts a token row and maps it', async () => {
    h.insertSingle.mockResolvedValue({
      data: { id: 'tok-1', covers_before: '2025-09-03', created_at: '2026-09-03T10:00:00Z' },
      error: null,
    })
    const t = await maintenanceRepository.recordExport('2025-09-03')
    expect(t).toEqual({ token: 'tok-1', coversBefore: '2025-09-03', createdAt: '2026-09-03T10:00:00Z' })
  })

  it('purge calls the RPC then removes the returned storage paths', async () => {
    h.rpc.mockResolvedValue({
      data: {
        counts: { bills: 2, billRows: 3, comments: 1, attachments: 2, storageBytes: 0 },
        storage_paths: ['bills/OLD-1/a.png', 'bills/OLD-2/b.pdf'],
      },
      error: null,
    })
    const r = await maintenanceRepository.purge('2025-09-03', 'tok-1')
    expect(h.rpc).toHaveBeenCalledWith('purge_archived_data', { p_before: '2025-09-03', p_token: 'tok-1' })
    expect(h.remove).toHaveBeenCalledWith(['bills/OLD-1/a.png', 'bills/OLD-2/b.pdf'])
    expect(r).toEqual({
      counts: { bills: 2, billRows: 3, comments: 1, attachments: 2, storageBytes: 0 },
      storagePathsRemoved: 2,
    })
  })

  it('purge with no storage paths skips storage.remove', async () => {
    h.rpc.mockResolvedValue({
      data: { counts: { bills: 1, billRows: 0, comments: 0, attachments: 0, storageBytes: 0 }, storage_paths: [] },
      error: null,
    })
    const r = await maintenanceRepository.purge('2025-09-03', 'tok-1')
    expect(h.remove).not.toHaveBeenCalled()
    expect(r.storagePathsRemoved).toBe(0)
  })

  it('propagates an RPC error', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: 'This export token was already used' } })
    await expect(maintenanceRepository.purge('2025-09-03', 'tok-1')).rejects.toBeTruthy()
  })

  it('loadArchiveBills maps a nested bill row into an ArchiveBill with a computed total', async () => {
    h.billsResult.mockResolvedValue({
      data: [
        {
          id: 'b1',
          bill_number: 'OLD-1',
          order_date: '2024-01-01',
          paid_amount: 500,
          profiles: { full_name: 'Ravi' },
          bill_statuses: { is_terminal: true },
          bill_rows: [
            {
              id: 'r1',
              detail: 'Poster',
              amount: 300,
              order_types: { name: 'Print' },
              order_status_history: [{ created_at: '2024-01-02', note: 'moved', to_stage: { name: 'Printing' } }],
            },
            { id: 'r2', detail: 'Discount', amount: -50, order_types: null, order_status_history: [] },
          ],
          bill_comments: [{ body: 'ship it', created_at: '2024-01-03', author: { full_name: 'Sam' } }],
        },
      ],
      error: null,
    })
    h.attsResult.mockResolvedValue({
      data: [{ file_name: 'proof.png', storage_path: 'bills/OLD-1/proof.png', owner_type: 'bill', owner_id: 'b1' }],
      error: null,
    })
    const [bill] = await maintenanceRepository.loadArchiveBills('2025-09-03')
    expect(bill.billNumber).toBe('OLD-1')
    expect(bill.customerName).toBe('Ravi')
    expect(bill.total).toBe(250) // 300 - 50
    expect(bill.rows).toHaveLength(2)
    expect(bill.history[0]).toEqual({ stage: 'Printing', at: '2024-01-02', note: 'moved' })
    expect(bill.comments[0]).toEqual({ author: 'Sam', body: 'ship it', at: '2024-01-03' })
    expect(bill.attachments).toEqual([{ filename: 'proof.png', storagePath: 'bills/OLD-1/proof.png' }])
  })

  it('downloadAttachment returns the blob', async () => {
    const b = await maintenanceRepository.downloadAttachment('bills/OLD-1/proof.png')
    expect(b).toBeInstanceOf(Blob)
    expect(h.download).toHaveBeenCalledWith('bills/OLD-1/proof.png')
  })
})
