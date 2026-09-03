import { supabase } from '@/core/supabase/client'
import type {
  BlockType,
  CompanyVM,
  GalleryImageVM,
  HomeBlockVM,
  HomePageVM,
  ProductVM,
  PromotionVM,
} from '@/features/home/home.types'

const BUCKET = 'content'
const MAX_BYTES = 5 * 1024 * 1024
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function extFor(type: string): string {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
}

interface BlockRow {
  type: BlockType
  sort_order: number
  is_visible: boolean
}
interface OrgRow {
  org_name: string
  tagline: string
  about: string
  address: string
  phone: string
  email: string
  hours: string
  logo_path: string | null
  socials: Record<string, string> | null
}
interface ProductRow {
  id: string
  category: string
  name: string
  description: string | null
  price: number
  image_path: string | null
  is_active: boolean
  sort_order: number
}
interface PromoRow {
  id: string
  title: string
  body: string | null
  image_path: string | null
  discount_kind: 'percent' | 'amount' | 'text'
  discount_value: string | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
}
interface GalleryRow {
  id: string
  caption: string | null
  image_path: string
  sort_order: number
}

function toProduct(r: ProductRow): ProductVM {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    imagePath: r.image_path,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }
}
function toPromo(r: PromoRow): PromotionVM {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    imagePath: r.image_path,
    discountKind: r.discount_kind,
    discountValue: r.discount_value,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }
}
function toGallery(r: GalleryRow): GalleryImageVM {
  return { id: r.id, caption: r.caption, imagePath: r.image_path, sortOrder: r.sort_order }
}

export function publicUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export const homeRepository = {
  async load(): Promise<HomePageVM> {
    const [blocks, org, products, promotions, gallery] = await Promise.all([
      supabase.from('home_blocks').select('type, sort_order, is_visible'),
      supabase
        .from('organization_settings')
        .select('org_name, tagline, about, address, phone, email, hours, logo_path, socials')
        .single(),
      supabase.from('products').select('*').is('deleted_at', null).order('sort_order'),
      supabase.from('promotions').select('*').is('deleted_at', null).order('sort_order'),
      supabase.from('gallery_images').select('*').is('deleted_at', null).order('sort_order'),
    ])
    for (const r of [blocks, org, products, promotions, gallery]) {
      if (r.error) throw r.error
    }
    const o = org.data as unknown as OrgRow
    return {
      blocks: (blocks.data as unknown as BlockRow[]).map((b) => ({
        type: b.type,
        sortOrder: b.sort_order,
        isVisible: b.is_visible,
      })),
      company: {
        name: o.org_name,
        tagline: o.tagline,
        about: o.about,
        address: o.address,
        phone: o.phone,
        email: o.email,
        hours: o.hours,
        logoPath: o.logo_path,
        socials: o.socials ?? {},
      } satisfies CompanyVM,
      products: (products.data as unknown as ProductRow[]).map(toProduct),
      promotions: (promotions.data as unknown as PromoRow[]).map(toPromo),
      gallery: (gallery.data as unknown as GalleryRow[]).map(toGallery),
    }
  },

  async setBlockVisible(type: BlockType, isVisible: boolean): Promise<void> {
    const { error } = await supabase.from('home_blocks').update({ is_visible: isVisible }).eq('type', type)
    if (error) throw error
  },

  async swapBlockOrder(a: HomeBlockVM, b: HomeBlockVM): Promise<void> {
    const e1 = await supabase.from('home_blocks').update({ sort_order: b.sortOrder }).eq('type', a.type)
    const e2 = await supabase.from('home_blocks').update({ sort_order: a.sortOrder }).eq('type', b.type)
    if (e1.error) throw e1.error
    if (e2.error) throw e2.error
  },

  async saveCompany(input: Omit<CompanyVM, 'name'>): Promise<void> {
    const { error } = await supabase
      .from('organization_settings')
      .update({
        tagline: input.tagline,
        about: input.about,
        address: input.address,
        phone: input.phone,
        email: input.email,
        hours: input.hours,
        socials: input.socials,
        logo_path: input.logoPath,
      })
      .eq('id', true)
    if (error) throw error
  },

  async upsertProduct(p: Partial<ProductVM> & { id?: string }): Promise<string> {
    const row = {
      category: p.category ?? '',
      name: p.name ?? '',
      description: p.description ?? null,
      price: p.price ?? 0,
      image_path: p.imagePath ?? null,
      is_active: p.isActive ?? true,
      sort_order: p.sortOrder ?? 0,
    }
    if (p.id) {
      const { error } = await supabase.from('products').update(row).eq('id', p.id)
      if (error) throw error
      return p.id
    }
    const { data, error } = await supabase.from('products').insert(row).select('id').single()
    if (error) throw error
    return (data as { id: string }).id
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async upsertPromotion(p: Partial<PromotionVM> & { id?: string }): Promise<string> {
    const row = {
      title: p.title ?? '',
      body: p.body ?? null,
      image_path: p.imagePath ?? null,
      discount_kind: p.discountKind ?? 'text',
      discount_value: p.discountValue ?? null,
      starts_at: p.startsAt ?? null,
      ends_at: p.endsAt ?? null,
      is_active: p.isActive ?? true,
      sort_order: p.sortOrder ?? 0,
    }
    if (p.id) {
      const { error } = await supabase.from('promotions').update(row).eq('id', p.id)
      if (error) throw error
      return p.id
    }
    const { data, error } = await supabase.from('promotions').insert(row).select('id').single()
    if (error) throw error
    return (data as { id: string }).id
  },

  async deletePromotion(id: string): Promise<void> {
    const { error } = await supabase
      .from('promotions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async addGalleryImage(input: { caption: string; imagePath: string; sortOrder?: number }): Promise<string> {
    const { data, error } = await supabase
      .from('gallery_images')
      .insert({ caption: input.caption, image_path: input.imagePath, sort_order: input.sortOrder ?? 0 })
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: string }).id
  },

  async updateGalleryCaption(id: string, caption: string): Promise<void> {
    const { error } = await supabase.from('gallery_images').update({ caption }).eq('id', id)
    if (error) throw error
  },

  async deleteGalleryImage(id: string): Promise<void> {
    const { error } = await supabase
      .from('gallery_images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async swapListOrder(
    table: 'products' | 'promotions' | 'gallery_images',
    a: { id: string; sortOrder: number },
    b: { id: string; sortOrder: number },
  ): Promise<void> {
    const e1 = await supabase.from(table).update({ sort_order: b.sortOrder }).eq('id', a.id)
    const e2 = await supabase.from(table).update({ sort_order: a.sortOrder }).eq('id', b.id)
    if (e1.error) throw e1.error
    if (e2.error) throw e2.error
  },

  async uploadImage(file: File, kind: 'product' | 'promo' | 'gallery' | 'logo'): Promise<string> {
    if (file.size > MAX_BYTES) throw new Error('Image must be 5 MB or smaller')
    if (!OK_TYPES.includes(file.type)) throw new Error('Image must be a PNG, JPEG or WebP')
    const path = `${kind}/${crypto.randomUUID()}.${extFor(file.type)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw error
    return path
  },
}
