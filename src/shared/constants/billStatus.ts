import type { BillListItemVM } from '@/features/bills/bills.types'

export type StatusBucket = 'open' | 'active' | 'done'

const BUCKET_BY_KEY: Record<string, StatusBucket> = {
  pending: 'open', draft: 'open', new: 'open', quote: 'open',
  active: 'active', in_progress: 'active', 'in-progress': 'active',
  completed: 'done', paid: 'done', delivered: 'done', done: 'done',
}

export function bucketOf(statusKey: string): StatusBucket {
  return BUCKET_BY_KEY[statusKey] ?? 'open'
}

export const BUCKET_COLOR: Record<StatusBucket, string> = {
  open: 'var(--color-neo-secondary)',
  active: 'var(--color-neo-primary)',
  done: 'var(--color-neo-success)',
}

export const BUCKET_LABEL: Record<StatusBucket, string> = {
  open: 'Pending',
  active: 'In progress',
  done: 'Completed',
}

export function progressFromBucket(statusKey: string): number {
  const b = bucketOf(statusKey)
  return b === 'done' ? 100 : b === 'active' ? 60 : 0
}

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function isOverdue(
  bill: Pick<BillListItemVM, 'deadline' | 'statusKey'>,
  now: Date = new Date(),
): boolean {
  if (!bill.deadline) return false
  if (bucketOf(bill.statusKey) === 'done') return false
  return new Date(bill.deadline) < startOfToday(now)
}

export type BillFilterKey = 'all' | 'open' | 'active' | 'done' | 'overdue'

export const BILL_FILTERS: { key: BillFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Pending' },
  { key: 'active', label: 'In progress' },
  { key: 'done', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
]

export function matchesFilter(
  bill: Pick<BillListItemVM, 'deadline' | 'statusKey'>,
  key: BillFilterKey,
  now: Date = new Date(),
): boolean {
  if (key === 'all') return true
  if (key === 'overdue') return isOverdue(bill, now)
  return bucketOf(bill.statusKey) === key
}
