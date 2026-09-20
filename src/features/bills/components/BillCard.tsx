import { motion } from 'framer-motion'
import { FileText, Check, Trash2, Wallet, Calendar, Clock } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { CardMenu } from '@/shared/ui/CardMenu'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { bucketOf, BUCKET_COLOR, progressFromBucket } from '@/shared/constants/billStatus'
import type { BillListItemVM } from '@/features/bills/bills.types'

export interface BillCardProps {
  bill: BillListItemVM
  onOpen: (b: BillListItemVM) => void
  onDelete?: (b: BillListItemVM) => void
  onRecordPayment?: (b: BillListItemVM) => void
}

export function BillCard({ bill, onOpen, onDelete, onRecordPayment }: BillCardProps) {
  const bucket = bucketOf(bill.statusKey)
  const pending = bill.total - bill.paidAmount
  const progress = progressFromBucket(bill.statusKey)
  const accent = BUCKET_COLOR[bucket]
  const Icon = bucket === 'done' ? Check : FileText

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      aria-label={`Open bill ${bill.billNumber}`}
      onClick={() => onOpen(bill)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(bill)
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] transition hover:shadow-[var(--shadow-neo-floating)]"
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, var(--color-neo-primary-2))` }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--color-neo-text-primary)]">{bill.billNumber}</div>
          {bill.customerName && (
            <div className="mt-0.5 truncate text-xs text-[var(--color-neo-text-secondary)]">{bill.customerName}</div>
          )}
        </div>
        <StatusBadge label={bill.statusLabel} color={accent} />
        {(onRecordPayment || onDelete) && (
          <CardMenu
            label={`Actions for ${bill.billNumber}`}
            items={[
              ...(onRecordPayment
                ? [{ label: 'Record payment', icon: Wallet, onClick: () => onRecordPayment(bill) }]
                : []),
              ...(onDelete
                ? [{ label: 'Delete', icon: Trash2, tone: 'danger' as const, onClick: () => onDelete(bill) }]
                : []),
            ]}
          />
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--color-neo-secondary)]/15 px-4 pb-3 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Total</span>
            <span className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{formatCurrency(bill.total)}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Pending</span>
            <span className={pending > 0 ? 'text-sm font-semibold text-[var(--color-neo-danger)]' : 'text-sm font-semibold text-[var(--color-neo-success)]'}>
              {formatCurrency(pending)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-neo-text-secondary)]">
          <span className="flex items-center gap-2"><Calendar size={13} className="shrink-0" />Ord: {bill.orderDate}</span>
          <span className="flex items-center gap-2"><Clock size={13} className="shrink-0" />Due: {bill.deadline ?? '—'}</span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Work progress</span>
            <span className="text-xs font-semibold text-[var(--color-neo-text-primary)]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-neo-surface)] shadow-[var(--shadow-neo-pressed)]">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: accent }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
