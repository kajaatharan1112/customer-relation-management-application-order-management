import {
  visibleBlocks,
  promotionState,
  activePromotionsForViewer,
  groupProducts,
} from '@/features/home/home.selectors'
import type { PromotionVM, ProductVM } from '@/features/home/home.types'

const now = new Date('2026-09-03T12:00:00')

const promo = (o: Partial<PromotionVM>): PromotionVM => ({
  id: 'x', title: 'T', body: null, imagePath: null, discountKind: 'text',
  discountValue: null, startsAt: null, endsAt: null, isActive: true, sortOrder: 0, ...o,
})
const product = (o: Partial<ProductVM>): ProductVM => ({
  id: 'p', category: '', name: 'N', description: null, price: 0, imagePath: null,
  isActive: true, sortOrder: 0, ...o,
})

it('promotionState', () => {
  expect(promotionState(promo({ startsAt: '2026-10-01' }), now)).toBe('scheduled')
  expect(promotionState(promo({ endsAt: '2026-08-01' }), now)).toBe('expired')
  expect(promotionState(promo({ startsAt: '2026-08-01', endsAt: '2026-10-01' }), now)).toBe('live')
  expect(promotionState(promo({}), now)).toBe('live') // open-ended
})

it('activePromotionsForViewer hides non-live for non-admins, shows all to admin', () => {
  const list = [promo({ id: 'a' }), promo({ id: 'b', endsAt: '2026-01-01' }), promo({ id: 'c', isActive: false })]
  expect(activePromotionsForViewer(list, false, now).map((p) => p.id)).toEqual(['a'])
  expect(activePromotionsForViewer(list, true, now).map((p) => p.id)).toEqual(['a', 'b', 'c'])
})

it('visibleBlocks: only is_visible, sorted', () => {
  expect(
    visibleBlocks([
      { type: 'album', sortOrder: 3, isVisible: false },
      { type: 'products', sortOrder: 1, isVisible: true },
      { type: 'company', sortOrder: 0, isVisible: true },
    ]).map((b) => b.type),
  ).toEqual(['company', 'products'])
})

it('groupProducts: first-seen category order, sortOrder within', () => {
  const g = groupProducts([
    product({ id: '1', category: 'Cakes', sortOrder: 1 }),
    product({ id: '2', category: 'Drinks', sortOrder: 0 }),
    product({ id: '3', category: 'Cakes', sortOrder: 0 }),
  ])
  expect(g.map((x) => x.category)).toEqual(['Cakes', 'Drinks'])
  expect(g[0].items.map((i) => i.id)).toEqual(['3', '1'])
})
