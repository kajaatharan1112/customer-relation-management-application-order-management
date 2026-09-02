export function formatCurrency(
  amount: number | null,
  opts: { code?: string; locale?: string } = {},
): string {
  if (amount === null) return '—'
  const { code = 'LKR', locale = 'en-LK' } = opts
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount)
}
