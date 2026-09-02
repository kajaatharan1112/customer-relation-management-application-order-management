export interface StatusBadgeProps {
  label: string
  color?: string
}

export function StatusBadge({ label, color = 'var(--color-neo-primary)' }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-neo-pill)] px-2.5 py-1 text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
