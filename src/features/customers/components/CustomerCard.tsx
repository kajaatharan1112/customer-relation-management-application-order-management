import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { CustomerVM } from '@/features/customers/customers.types'
import type { CustomerFinance } from '@/features/customers/customers.selectors'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'

export interface CustomerCardProps {
  customer: CustomerVM
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
  finance?: CustomerFinance
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function CustomerCard({ customer, onEdit, onDelete, finance }: CustomerCardProps) {
  const c = customer
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]"
    >
      <div className="flex items-center gap-3 p-4">
        <span
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), #8b5cf6)' }}
        >
          {initials(c.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-[var(--color-neo-text-primary)]">{c.fullName}</div>
          {c.companyName ? (
            <div className="truncate text-xs text-[var(--color-neo-text-secondary)]">{c.companyName}</div>
          ) : (
            <div className="text-xs italic text-[var(--color-neo-text-secondary)]/70">No company</div>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-neo-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-neo-primary)] shadow-[var(--shadow-neo-pressed)]">
          {c.billCount} {c.billCount === 1 ? 'bill' : 'bills'}
        </span>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--color-neo-secondary)]/15 p-4 text-[13px] text-[var(--color-neo-text-secondary)]">
        <span className="flex items-center gap-2.5"><Mail size={15} className="shrink-0" /><span className="truncate">{c.email}</span></span>
        <span className="flex items-center gap-2.5">
          <Phone size={15} className="shrink-0" />
          {c.phone ?? <span className="italic text-[var(--color-neo-text-secondary)]/70">No phone</span>}
        </span>
        <span className="flex items-center gap-2.5">
          <MapPin size={15} className="shrink-0" />
          {c.city ?? <span className="italic text-[var(--color-neo-text-secondary)]/70">No city</span>}
        </span>
      </div>

      {finance && (
        <div className="flex flex-col gap-1 border-t border-[var(--color-neo-secondary)]/15 p-4 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-neo-text-secondary)]">Billed</span>
            <span className="font-semibold text-[var(--color-neo-text-primary)]">{formatLKRShort(finance.billed)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-neo-text-secondary)]">Outstanding</span>
            <span
              className={
                finance.outstanding > 0
                  ? 'text-[var(--color-neo-danger)] font-semibold'
                  : 'text-[var(--color-neo-text-primary)] font-semibold'
              }
            >
              {formatLKRShort(finance.outstanding)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-neo-text-secondary)]">Last order</span>
            <span className="text-[var(--color-neo-text-secondary)]">{finance.lastOrderDate ?? 'No orders'}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
        <button type="button" onClick={() => onEdit(c)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95">
          <Pencil size={15} />Edit
        </button>
        <button type="button" onClick={() => onDelete(c)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95">
          <Trash2 size={15} />Delete
        </button>
      </div>
    </motion.div>
  )
}
