import { Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { useRole } from '@/core/auth/auth.hooks'
import { useHomePage } from '@/features/home/queries/useHomePage'
import { useHomeMutations } from '@/features/home/mutations/useHomeMutations'
import { visibleBlocks } from '@/features/home/home.selectors'
import { CompanyBlock } from '@/features/home/components/blocks/CompanyBlock'
import { ProductsBlock } from '@/features/home/components/blocks/ProductsBlock'
import { PromotionsBlock } from '@/features/home/components/blocks/PromotionsBlock'
import { AlbumBlock } from '@/features/home/components/blocks/AlbumBlock'
import type { BlockType, HomeBlockVM, HomePageVM } from '@/features/home/home.types'

const BLOCK_TITLE: Record<BlockType, string> = {
  company: 'Company',
  products: 'Products',
  promotions: 'Advertisements',
  album: 'Album',
}

export default function HomePage() {
  const { data, isLoading, isError } = useHomePage()
  const { isAdmin } = useRole()
  const m = useHomeMutations()

  if (isLoading)
    return <p className="p-6 text-sm text-[var(--color-neo-text-secondary)] md:p-8">Loading…</p>
  if (isError || !data)
    return <p className="p-6 text-sm text-[var(--color-neo-danger)] md:p-8">Could not load this page.</p>

  const editable = isAdmin
  const ordered = data.blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const moveBlock = (b: HomeBlockVM, dir: -1 | 1) => {
    const i = ordered.findIndex((x) => x.type === b.type)
    const other = ordered[i + dir]
    if (other) m.swapBlockOrder.mutate({ a: b, b: other })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6 md:p-8">
      {editable && (
        <Card className="p-4">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[var(--color-neo-text-secondary)]">
            Page layout
          </h2>
          <ul className="space-y-1.5">
            {ordered.map((b, i) => (
              <li
                key={b.type}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-neo-bg)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]"
              >
                <span className="flex-1 text-sm font-semibold text-[var(--color-neo-text-primary)]">
                  {BLOCK_TITLE[b.type]}
                  {!b.isVisible && (
                    <span className="ml-2 text-xs font-normal text-[var(--color-neo-text-secondary)]">
                      hidden
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={b.isVisible ? `Hide ${b.type}` : `Show ${b.type}`}
                  onClick={() => m.setBlockVisible.mutate({ type: b.type, isVisible: !b.isVisible })}
                  className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]"
                >
                  {b.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  type="button"
                  aria-label={`Move ${b.type} up`}
                  disabled={i === 0}
                  onClick={() => moveBlock(b, -1)}
                  className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)] disabled:opacity-30"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${b.type} down`}
                  disabled={i === ordered.length - 1}
                  onClick={() => moveBlock(b, 1)}
                  className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)] disabled:opacity-30"
                >
                  <ChevronDown size={15} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {visibleBlocks(data.blocks).map((b) => (
        <BlockView key={b.type} type={b.type} data={data} editable={editable} isAdmin={isAdmin} m={m} />
      ))}
    </div>
  )
}

function BlockView({
  type,
  data,
  editable,
  isAdmin,
  m,
}: {
  type: BlockType
  data: HomePageVM
  editable: boolean
  isAdmin: boolean
  m: ReturnType<typeof useHomeMutations>
}) {
  if (type === 'company')
    return (
      <CompanyBlock
        company={data.company}
        editable={editable}
        onSave={(input) => m.saveCompany.mutateAsync(input).then(() => undefined)}
        onUploadLogo={(file) => m.uploadImage.mutateAsync({ file, kind: 'logo' })}
      />
    )

  if (type === 'products')
    return (
      <ProductsBlock
        products={data.products}
        editable={editable}
        actions={{
          upsert: (p) => m.upsertProduct.mutateAsync(p),
          remove: (id) => m.deleteProduct.mutateAsync(id),
          swapOrder: (a, b) =>
            m.swapListOrder.mutateAsync({
              table: 'products',
              a: { id: a.id, sortOrder: a.sortOrder },
              b: { id: b.id, sortOrder: b.sortOrder },
            }),
          uploadImage: (file) => m.uploadImage.mutateAsync({ file, kind: 'product' }),
        }}
      />
    )

  if (type === 'promotions')
    return (
      <PromotionsBlock
        promotions={data.promotions}
        editable={editable}
        isAdmin={isAdmin}
        actions={{
          upsert: (p) => m.upsertPromotion.mutateAsync(p),
          remove: (id) => m.deletePromotion.mutateAsync(id),
          swapOrder: (a, b) =>
            m.swapListOrder.mutateAsync({
              table: 'promotions',
              a: { id: a.id, sortOrder: a.sortOrder },
              b: { id: b.id, sortOrder: b.sortOrder },
            }),
          uploadImage: (file) => m.uploadImage.mutateAsync({ file, kind: 'promo' }),
        }}
      />
    )

  return (
    <AlbumBlock
      images={data.gallery}
      editable={editable}
      actions={{
        add: (input) => m.addGalleryImage.mutateAsync(input),
        remove: (id) => m.deleteGalleryImage.mutateAsync(id),
        swapOrder: (a, b) =>
          m.swapListOrder.mutateAsync({
            table: 'gallery_images',
            a: { id: a.id, sortOrder: a.sortOrder },
            b: { id: b.id, sortOrder: b.sortOrder },
          }),
        updateCaption: (id, caption) => m.updateGalleryCaption.mutateAsync({ id, caption }),
        uploadImage: (file) => m.uploadImage.mutateAsync({ file, kind: 'gallery' }),
      }}
    />
  )
}
