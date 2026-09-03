import { cn } from '@/shared/utils/cn'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] p-1 shadow-[var(--shadow-neo-pressed)]"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-7 rounded-[var(--radius-neo-pill)] px-4 text-xs font-semibold transition-colors',
              active
                ? 'bg-[var(--color-neo-card)] text-[var(--color-neo-primary)] shadow-[var(--shadow-neo-soft)]'
                : 'text-[var(--color-neo-text-secondary)]',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
