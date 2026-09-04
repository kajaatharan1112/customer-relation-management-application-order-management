import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  id: string
  error?: string
  /** Span both columns of a <FormGrid> on desktop. */
  full?: boolean
  children: ReactNode
}

/** Grid-friendly <select>, styled to match <Field>. */
export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, id, error, full, className, children, ...props }, ref) => (
    <div data-field className={cn(full && 'md:col-span-2')}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]"
      >
        {label}
      </label>
      <select
        id={id}
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[var(--radius-neo-md)] bg-[var(--color-neo-bg)] px-3 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none transition focus:ring-2 focus:ring-[var(--color-neo-primary)]/40 focus:ring-offset-1 focus:ring-offset-[var(--color-neo-bg)]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-[var(--color-neo-danger)]">{error}</p>}
    </div>
  ),
)
Select.displayName = 'FormSelect'
