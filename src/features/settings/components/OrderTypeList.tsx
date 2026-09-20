import { motion } from 'framer-motion'
import { Tag, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { CardMenu } from '@/shared/ui/CardMenu'
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
          role={canWrite ? 'button' : undefined}
          tabIndex={canWrite ? 0 : undefined}
          onClick={canWrite ? () => onEdit(o) : undefined}
          onKeyDown={
            canWrite
              ? (e) => {
                  if (e.key === 'Enter') onEdit(o)
                }
              : undefined
          }
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={
            canWrite
              ? 'flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] transition hover:shadow-[var(--shadow-neo-floating)]'
              : 'flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]'
          }
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
            {canWrite && (
              <CardMenu
                label={`Actions for ${o.name}`}
                items={[{ label: 'Delete', icon: Trash2, tone: 'danger', onClick: () => onDelete(o) }]}
              />
            )}
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
        </motion.div>
      ))}
    </div>
  )
}
