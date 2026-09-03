import { bucketOf } from '@/shared/constants/billStatus'

function shiftMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate())
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Default purge cut-off: bills whose order date is older than 12 months. */
export function defaultCutoff(today: Date = new Date()): string {
  return ymd(shiftMonths(today, -12))
}

/** An admin may pick an older cut-off but never one younger than 18 months. */
export function clampCutoff(date: string, today: Date = new Date()): string {
  const max = ymd(shiftMonths(today, -18))
  return date > max ? max : date
}

/** A bill is eligible to purge when it is "done" (terminal status) and older than the cut-off. */
export function isBillEligible(
  bill: { orderDate: string; statusKey: string },
  cutoff: string,
): boolean {
  return bucketOf(bill.statusKey) === 'done' && bill.orderDate.slice(0, 10) < cutoff
}
