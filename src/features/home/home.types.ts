export type BlockType = 'company' | 'album' | 'products' | 'promotions'
export type DiscountKind = 'percent' | 'amount' | 'text'

export interface HomeBlockVM {
  type: BlockType
  sortOrder: number
  isVisible: boolean
}

export interface CompanyVM {
  name: string
  tagline: string
  about: string
  address: string
  phone: string
  email: string
  hours: string
  logoPath: string | null
  socials: Record<string, string>
}

export interface ProductVM {
  id: string
  category: string
  name: string
  description: string | null
  price: number
  imagePath: string | null
  isActive: boolean
  sortOrder: number
}

export interface PromotionVM {
  id: string
  title: string
  body: string | null
  imagePath: string | null
  discountKind: DiscountKind
  discountValue: string | null
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  sortOrder: number
}

export interface GalleryImageVM {
  id: string
  caption: string | null
  imagePath: string
  sortOrder: number
}

export interface HomePageVM {
  blocks: HomeBlockVM[]
  company: CompanyVM
  products: ProductVM[]
  promotions: PromotionVM[]
  gallery: GalleryImageVM[]
}
