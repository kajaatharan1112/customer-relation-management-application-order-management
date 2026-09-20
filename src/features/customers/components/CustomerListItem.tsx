import { Pencil, Ban, FilePlus2 } from 'lucide-react'
import { CardMenu } from '@/shared/ui/CardMenu'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { CustomerVM } from '@/features/customers/customers.types'
import type { CustomerFinance } from '@/features/customers/customers.selectors'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { cn } from '@/shared/utils/cn'

export interface CustomerListItemProps {
  customer: CustomerVM
  selected: boolean
  onSelect: (c: CustomerVM) => void
  onEdit: (c: CustomerVM) => void
  onDelete: (c: CustomerVM) => void
  onAddBill: (c: CustomerVM) => void
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

export function CustomerListItem({ customer: c, selected, onSelect, onEdit, onDelete, onAddBill, finance }: CustomerListItemProps) {
  const invited = c.status === 'invited'
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${c.fullName}`}
      onClick={() => onSelect(c)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect(c)
      }}
      aria-pressed={selected}
      className={cn(
        'relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition',
        selected ? 'bg-[var(--color-neo-primary)]/10' : 'hover:bg-[var(--color-neo-surface)]',
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), var(--color-neo-primary-2))' }}
      >
        {initials(c.fullName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-[var(--color-neo-text-primary)]">{c.fullName}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {invited && <StatusBadge label="Invited" color="var(--color-neo-warning)" />}
            <span className="text-[11px] font-semibold text-[var(--color-neo-text-secondary)]">
              {c.billCount} {c.billCount === 1 ? 'bill' : 'bills'}
            </span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-[var(--color-neo-text-secondary)]">
            {c.companyName ?? <span className="italic text-[var(--color-neo-text-secondary)]/70">No company</span>}
          </span>
          {finance && finance.outstanding > 0 && (
            <span className="shrink-0 text-xs font-semibold text-[var(--color-neo-danger)]">
              {formatLKRShort(finance.outstanding)}
            </span>
          )}
        </div>
      </div>

      <CardMenu
        label={`Actions for ${c.fullName}`}
        items={[
          { label: 'Add bill', icon: FilePlus2, onClick: () => onAddBill(c) },
          { label: 'Edit', icon: Pencil, onClick: () => onEdit(c) },
          { label: 'Block', icon: Ban, tone: 'danger', onClick: () => onDelete(c) },
        ]}
      />
    </div>
  )
}
