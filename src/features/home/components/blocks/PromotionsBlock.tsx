import { useState } from 'react'
import { Megaphone, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/features/auth/authShared'
import { publicUrl } from '@/features/home/data/home.repository'
import { activePromotionsForViewer, promotionState } from '@/features/home/home.selectors'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { DiscountKind, PromotionVM } from '@/features/home/home.types'

export interface PromotionsActions {
  upsert: (p: Partial<PromotionVM> & { id?: string }) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  swapOrder: (a: PromotionVM, b: PromotionVM) => Promise<unknown>
  uploadImage: (file: File) => Promise<string>
}

type Draft = {
  id?: string
  title: string
  body: string
  discountKind: DiscountKind
  discountValue: string
  startsAt: string
  endsAt: string
  isActive: boolean
  imagePath: string | null
}

const emptyDraft: Draft = {
  title: '',
  body: '',
  discountKind: 'text',
  discountValue: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
  imagePath: null,
}

const toDraft = (p: PromotionVM): Draft => ({
  id: p.id,
  title: p.title,
  body: p.body ?? '',
  discountKind: p.discountKind,
  discountValue: p.discountValue ?? '',
  startsAt: p.startsAt?.slice(0, 10) ?? '',
  endsAt: p.endsAt?.slice(0, 10) ?? '',
  isActive: p.isActive,
  imagePath: p.imagePath,
})

function discountLabel(kind: DiscountKind, value: string | null): string | null {
  if (!value) return null
  if (kind === 'percent') return `${value}% off`
  if (kind === 'amount') return `${formatCurrency(Number(value) || 0)} off`
  return value
}

const STATE_LABEL: Record<ReturnType<typeof promotionState>, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  expired: 'Expired',
}

export function PromotionsBlock({
  promotions,
  editable,
  isAdmin,
  actions,
}: {
  promotions: PromotionVM[]
  editable: boolean
  isAdmin: boolean
  actions: PromotionsActions
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const shown = activePromotionsForViewer(promotions, isAdmin)
  const flat = promotions.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const save = async () => {
    if (!draft) return
    setBusy(true)
    try {
      await actions.upsert({
        id: draft.id,
        title: draft.title,
        body: draft.body || null,
        discountKind: draft.discountKind,
        discountValue: draft.discountValue || null,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
        isActive: draft.isActive,
        imagePath: draft.imagePath,
      })
      setDraft(null)
    } finally {
      setBusy(false)
    }
  }

  const move = (p: PromotionVM, dir: -1 | 1) => {
    const i = flat.findIndex((x) => x.id === p.id)
    const other = flat[i + dir]
    if (other) void actions.swapOrder(p, other)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <Megaphone size={16} />
          Advertisements &amp; discounts
        </h2>
        {editable && !draft && (
          <button
            type="button"
            onClick={() => setDraft({ ...emptyDraft })}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-neo-primary)]"
          >
            <Plus size={14} />Add advertisement
          </button>
        )}
      </div>

      {editable && draft && (
        <div className="mt-4 rounded-xl bg-[var(--color-neo-bg)] p-4 shadow-[var(--shadow-neo-pressed)]">
          <Field
            id="ad-title"
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Field
            id="ad-body"
            label="Body"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--color-neo-text-primary)]">Discount kind</span>
            <select
              value={draft.discountKind}
              onChange={(e) => setDraft({ ...draft, discountKind: e.target.value as DiscountKind })}
              className="h-10 w-full rounded-[var(--radius-neo-md)] bg-[var(--color-neo-bg)] px-3 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none"
            >
              <option value="text">Text</option>
              <option value="percent">Percent</option>
              <option value="amount">Amount</option>
            </select>
          </label>
          <Field
            id="ad-value"
            label="Discount value"
            value={draft.discountValue}
            onChange={(e) => setDraft({ ...draft, discountValue: e.target.value })}
          />
          <Field
            id="ad-starts"
            label="Starts at"
            type="date"
            value={draft.startsAt}
            onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
          />
          <Field
            id="ad-ends"
            label="Ends at"
            type="date"
            value={draft.endsAt}
            onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
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

      {shown.length === 0 && !draft && (
        <p className="mt-4 text-sm text-[var(--color-neo-text-secondary)]">No advertisements right now.</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map((p) => {
          const img = publicUrl(p.imagePath)
          const pill = discountLabel(p.discountKind, p.discountValue)
          const state = promotionState(p)
          return (
            <div
              key={p.id}
              className="rounded-xl bg-[var(--color-neo-bg)] p-4 shadow-[var(--shadow-neo-soft)]"
            >
              {img && <img src={img} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />}
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{p.title}</p>
                {pill && (
                  <span className="rounded-md bg-[var(--color-neo-primary)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-neo-primary)]">
                    {pill}
                  </span>
                )}
                {editable && (state !== 'live' || !p.isActive) && (
                  <span className="rounded-md bg-[var(--color-neo-text-secondary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-neo-text-secondary)]">
                    {p.isActive ? STATE_LABEL[state] : 'Inactive'}
                  </span>
                )}
              </div>
              {p.body && (
                <p className="mt-1 text-xs text-[var(--color-neo-text-secondary)]">{p.body}</p>
              )}
              {editable && (
                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${p.title} up`}
                    onClick={() => move(p, -1)}
                    className="rounded-md p-1 text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${p.title} down`}
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
    </Card>
  )
}
