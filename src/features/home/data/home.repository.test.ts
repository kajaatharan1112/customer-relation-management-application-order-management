import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  blocks: vi.fn(),
  orgSingle: vi.fn(),
  productsOrder: vi.fn(),
  promotionsOrder: vi.fn(),
  galleryOrder: vi.fn(),
  update: vi.fn().mockResolvedValue({ error: null }),
  insertSingle: vi.fn(),
  upload: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => {
  const chainFor = (table: string) => ({
    select: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: table === 'organization_settings' ? h.orgSingle : h.insertSingle,
    order: () =>
      table === 'products'
        ? h.productsOrder()
        : table === 'promotions'
          ? h.promotionsOrder()
          : h.galleryOrder(),
    update: vi.fn(() => ({ eq: h.update })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: h.insertSingle })) })),
  })
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'home_blocks') {
          const c = chainFor(table)
          // load() does supabase.from('home_blocks').select(...) with no .order()
          return { ...c, select: vi.fn(() => h.blocks()) }
        }
        return chainFor(table)
      }),
      storage: {
        from: vi.fn(() => ({
          upload: h.upload,
          getPublicUrl: (p: string) => ({ data: { publicUrl: `http://cdn/${p}` } }),
        })),
      },
    },
  }
})

import { homeRepository, publicUrl } from '@/features/home/data/home.repository'

describe('homeRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.blocks.mockResolvedValue({ data: [{ type: 'company', sort_order: 0, is_visible: true }], error: null })
    h.orgSingle.mockResolvedValue({
      data: {
        org_name: 'Acme', tagline: 'best', about: 'a', address: 'x', phone: '1', email: 'e', hours: '9-5',
        logo_path: 'logo/x.png', socials: { ig: 'acme' },
      },
      error: null,
    })
    h.productsOrder.mockResolvedValue({
      data: [{ id: 'p1', category: 'Print', name: 'Card', description: null, price: '150.00', image_path: null, is_active: true, sort_order: 0 }],
      error: null,
    })
    h.promotionsOrder.mockResolvedValue({ data: [], error: null })
    h.galleryOrder.mockResolvedValue({ data: [], error: null })
  })

  it('load maps every entity to VMs', async () => {
    const vm = await homeRepository.load()
    expect(vm.blocks[0]).toEqual({ type: 'company', sortOrder: 0, isVisible: true })
    expect(vm.company.name).toBe('Acme')
    expect(vm.company.socials).toEqual({ ig: 'acme' })
    expect(vm.products[0]).toMatchObject({ id: 'p1', price: 150, category: 'Print' })
  })

  it('publicUrl builds a CDN url or null', () => {
    expect(publicUrl(null)).toBeNull()
    expect(publicUrl('product/a.png')).toBe('http://cdn/product/a.png')
  })

  it('uploadImage rejects oversize and bad type, accepts a small png', async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'b.png', { type: 'image/png' })
    await expect(homeRepository.uploadImage(big, 'product')).rejects.toThrow(/5 MB/)
    const txt = new File(['x'], 'a.txt', { type: 'text/plain' })
    await expect(homeRepository.uploadImage(txt, 'product')).rejects.toThrow(/PNG, JPEG or WebP/)
    const ok = new File(['x'], 'a.png', { type: 'image/png' })
    const path = await homeRepository.uploadImage(ok, 'product')
    expect(path).toMatch(/^product\/.+\.png$/)
    expect(h.upload).toHaveBeenCalled()
  })

  it('upsertProduct inserts without id, updates with id', async () => {
    h.insertSingle.mockResolvedValue({ data: { id: 'new-1' }, error: null })
    expect(await homeRepository.upsertProduct({ name: 'X', price: 1 })).toBe('new-1')
    expect(await homeRepository.upsertProduct({ id: 'e1', name: 'Y', price: 2 })).toBe('e1')
    expect(h.update).toHaveBeenCalled()
  })

  it('deleteProduct sets deleted_at', async () => {
    await homeRepository.deleteProduct('p1')
    expect(h.update).toHaveBeenCalled()
  })
})
