import type { HomeBlockVM, ProductVM, PromotionVM } from '@/features/home/home.types'

export function visibleBlocks(blocks: HomeBlockVM[]): HomeBlockVM[] {
  return blocks.filter((b) => b.isVisible).slice().sort((a, b) => a.sortOrder - b.sortOrder)
}

export function promotionState(
  p: Pick<PromotionVM, 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): 'live' | 'scheduled' | 'expired' {
  const t = now.getTime()
  if (p.startsAt && new Date(p.startsAt).getTime() > t) return 'scheduled'
  if (p.endsAt && new Date(p.endsAt).getTime() < t) return 'expired'
  return 'live'
}

/** Admins see every promotion (sorted); everyone else sees only active + live ones. */
export function activePromotionsForViewer(
  promos: PromotionVM[],
  isAdmin: boolean,
  now: Date = new Date(),
): PromotionVM[] {
  const sorted = promos.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  if (isAdmin) return sorted
  return sorted.filter((p) => p.isActive && promotionState(p, now) === 'live')
}

export function groupProducts(products: ProductVM[]): { category: string; items: ProductVM[] }[] {
  const order: string[] = []
  const map = new Map<string, ProductVM[]>()
  for (const p of products) {
    if (!map.has(p.category)) {
      map.set(p.category, [])
      order.push(p.category)
    }
    map.get(p.category)!.push(p)
  }
  return order.map((category) => ({
    category,
    items: map.get(category)!.slice().sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}
