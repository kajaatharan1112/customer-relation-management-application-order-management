import { motion } from 'framer-motion'
import { Tag, Pencil, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import type { OrderTypeVM } from '@/features/settings/settings.types'

export function OrderTypeList({
  orderTypes,
  canWrite,
  onEdit,
  onDelete,
}: {
  orderTypes: OrderTypeVM[]
  canWrite: boolean
  onEdit: (o: OrderTypeVM) => void
  onDelete: (o: OrderTypeVM) => void
}) {
  if (orderTypes.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No order types yet.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {orderTypes.map((o) => (
        <motion.div
          key={o.id}
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]"
        >
          <div className="flex items-start gap-3 p-4">
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), var(--color-neo-primary-2))' }}
            >
              <Tag size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--color-neo-text-primary)]">{o.name}</div>
            </div>
            <StatusBadge
              label={o.isActive ? 'Active' : 'Inactive'}
              color={o.isActive ? 'var(--color-neo-success)' : 'var(--color-neo-secondary)'}
            />
          </div>

          <div className="border-t border-[var(--color-neo-secondary)]/15 px-4 pb-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
                  Workflow
                </span>
                <span className="truncate text-sm font-semibold text-[var(--color-neo-text-primary)]">
                  {o.workflowName}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
                  Fixed amount
                </span>
                <span className="text-sm font-semibold text-[var(--color-neo-text-primary)]">
                  {formatCurrency(o.fixedAmount)}
                </span>
              </div>
            </div>
          </div>

          {canWrite && (
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={() => onEdit(o)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95"
              >
                <Pencil size={15} />Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(o)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95"
              >
                <Trash2 size={15} />Delete
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
