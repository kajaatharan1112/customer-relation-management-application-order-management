import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { BillRowDraft } from '@/features/bills/bills.types'

interface OrderTypeOption {
  id: string
  name: string
  fixedAmount: number | null
}

export function BillRowsEditor({
  rows,
  orderTypes,
  onChange,
}: {
  rows: BillRowDraft[]
  orderTypes: OrderTypeOption[]
  onChange: (next: BillRowDraft[]) => void
}) {
  const update = (i: number, patch: Partial<BillRowDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const pickType = (i: number, id: string) => {
    const ot = orderTypes.find((o) => o.id === id)
    const row = rows[i]
    const shouldFill = (row.amount === 0 || Number.isNaN(row.amount)) && ot?.fixedAmount != null
    update(i, {
      orderTypeId: id || null,
      amount: shouldFill ? (ot!.fixedAmount as number) : row.amount,
    })
  }

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i))
  const add = () => onChange([...rows, { detail: '', orderTypeId: null, amount: 0 }])

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-neo-text-primary)]">Rows</h3>

      {rows.map((r, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 shadow-[var(--shadow-neo-pressed)]"
        >
          <input
            aria-label={`Row ${i + 1} detail`}
            placeholder="Detail"
            value={r.detail}
            onChange={(e) => update(i, { detail: e.target.value })}
            className="h-9 min-w-[10rem] flex-1 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-neo-primary)]"
          />
          <select
            aria-label={`Row ${i + 1} order type`}
            value={r.orderTypeId ?? ''}
            onChange={(e) => pickType(i, e.target.value)}
            className="h-9 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-sm"
          >
            <option value="">No type</option>
            {orderTypes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            aria-label={`Row ${i + 1} amount`}
            type="number"
            placeholder="0"
            value={r.amount === 0 || Number.isNaN(r.amount) ? '' : r.amount}
            onChange={(e) =>
              update(i, { amount: e.target.value === '' ? 0 : Number(e.target.value) })
            }
            onFocus={(e) => e.target.select()}
            className="h-9 w-28 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-right text-sm"
          />
          <button
            type="button"
            aria-label={`Delete row ${i + 1}`}
            onClick={() => remove(i)}
            className="rounded p-1.5 text-[var(--color-neo-danger)] hover:bg-[var(--color-neo-card)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={add}>
          Add row
        </Button>
        <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">
          Total: {formatCurrency(total)}
        </p>
      </div>
    </div>
  )
}
