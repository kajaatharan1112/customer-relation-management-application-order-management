import { useState } from 'react'
import { Tag, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/features/auth/authShared'
import { publicUrl } from '@/features/home/data/home.repository'
import { groupProducts } from '@/features/home/home.selectors'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { ProductVM } from '@/features/home/home.types'

export interface ProductsActions {
  upsert: (p: Partial<ProductVM> & { id?: string }) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  swapOrder: (a: ProductVM, b: ProductVM) => Promise<unknown>
  uploadImage: (file: File) => Promise<string>
}

type Draft = {
  id?: string
  name: string
  category: string
  description: string
  price: string
  isActive: boolean
  imagePath: string | null
}

const emptyDraft: Draft = {
  name: '',
  category: '',
  description: '',
  price: '',
  isActive: true,
  imagePath: null,
}

const toDraft = (p: ProductVM): Draft => ({
  id: p.id,
  name: p.name,
  category: p.category,
  description: p.description ?? '',
  price: String(p.price),
  isActive: p.isActive,
  imagePath: p.imagePath,
})

export function ProductsBlock({
  products,
  editable,
  actions,
}: {
  products: ProductVM[]
  editable: boolean
  actions: ProductsActions
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const shown = editable ? products : products.filter((p) => p.isActive)
  const groups = groupProducts(shown)
  const flat = products.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const save = async () => {
    if (!draft) return
    setBusy(true)
    try {
      await actions.upsert({
        id: draft.id,
        name: draft.name,
        category: draft.category,
        description: draft.description || null,
        price: Number(draft.price) || 0,
        isActive: draft.isActive,
        imagePath: draft.imagePath,
      })
      setDraft(null)
    } finally {
      setBusy(false)
    }
  }

  const move = (p: ProductVM, dir: -1 | 1) => {
    const i = flat.findIndex((x) => x.id === p.id)
    const other = flat[i + dir]
    if (other) void actions.swapOrder(p, other)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <Tag size={16} />
          Products &amp; pricing
        </h2>
        {editable && !draft && (
          <button
            type="button"
            onClick={() => setDraft({ ...emptyDraft })}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-neo-primary)]"
          >
            <Plus size={14} />Add product
          </button>
        )}
      </div>

      {editable && draft && (
        <div className="mt-4 rounded-xl bg-[var(--color-neo-bg)] p-4 shadow-[var(--shadow-neo-pressed)]">
          <Field
            id="p-name"
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Field
            id="p-category"
            label="Category"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          />
          <Field
            id="p-description"
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <Field
            id="p-price"
            label="Price"
            type="number"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <label className="mb-3 flex items-center gap-2 text-sm text-[var(--color-neo-text-primary)]">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Active
          </label>
          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--color-neo-text-primary)]">Image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setDraft({ ...draft, imagePath: await actions.uploadImage(f) })
              }}
              className="text-xs text-[var(--color-neo-text-secondary)]"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={busy} onClick={save}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {groups.length === 0 && !draft && (
        <p className="mt-4 text-sm text-[var(--color-neo-text-secondary)]">No products yet.</p>
      )}

      <div className="mt-4 space-y-6">
        {groups.map((g) => (
          <div key={g.category || '_'}>
            {g.category && (
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-neo-text-secondary)]">
                {g.category}
              </h3>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((p) => {
                const img = publicUrl(p.imagePath)
                return (
                  <div
                    key={p.id}
                    className="rounded-xl bg-[var(--color-neo-bg)] p-3 shadow-[var(--shadow-neo-soft)]"
                  >
                    {img && <img src={img} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{p.name}</p>
                      {editable && !p.isActive && (
                        <span className="rounded-md bg-[var(--color-neo-text-secondary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-neo-text-secondary)]">
                          Inactive
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-0.5 text-xs text-[var(--color-neo-text-secondary)]">{p.description}</p>
                    )}
                    <p className="mt-1 text-sm font-bold text-[var(--color-neo-primary)]">
                      {formatCurrency(p.price)}
                    </p>
                    {editable && (
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Move ${p.name} up`}
                          onClick={() => move(p, -1)}
                          className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${p.name} down`}
                          onClick={() => move(p, 1)}
                          className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(toDraft(p))}
                          className="ml-auto flex items-center gap-1 text-xs font-semibold text-[var(--color-neo-primary)]"
                        >
                          <Pencil size={12} />Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void actions.remove(p.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-[var(--color-neo-danger)]"
                        >
                          <Trash2 size={12} />Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
