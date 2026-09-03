export function formatLKRShort(n: number): string {
  if (!Number.isFinite(n)) return 'LKR 0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `LKR ${trim(n / 1_000_000)}M`
  if (abs >= 1_000) return `LKR ${trim(n / 1_000)}k`
  return `LKR ${Math.round(n)}`
}

function trim(x: number): string {
  const r = Math.round(x * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}
