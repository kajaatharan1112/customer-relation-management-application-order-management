import { FileText, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { bucketOf, BUCKET_COLOR } from '@/shared/constants/billStatus'
import type { BillListItemVM } from '@/features/bills/bills.types'

export function RecentBillsList({
  bills,
  onOpen,
}: {
  bills: BillListItemVM[]
  onOpen: (b: BillListItemVM) => void
}) {
  if (bills.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills yet</p>
  }
  return (
    <div className="flex flex-col">
      {bills.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onOpen(b)}
          className="flex items-center gap-3.5 border-b border-[var(--color-neo-secondary)]/12 py-3 text-left last:border-0"
        >
          <span
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-white"
            style={{ background: `linear-gradient(135deg, ${BUCKET_COLOR[bucketOf(b.statusKey)]}, var(--color-neo-primary-2))` }}
          >
            <FileText size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[var(--color-neo-text-primary)]">{b.billNumber}</span>
            <span className="block truncate text-[11px] text-[var(--color-neo-text-secondary)]">{b.customerName}</span>
          </span>
          <span className="text-[13px] font-semibold text-[var(--color-neo-text-primary)]">{formatLKRShort(b.total)}</span>
          <StatusBadge label={b.statusLabel} color={BUCKET_COLOR[bucketOf(b.statusKey)]} />
          <ChevronRight size={16} className="text-[var(--color-neo-text-secondary)]/60" />
        </button>
      ))}
    </div>
  )
}
