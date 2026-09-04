import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
  /** Span both columns of a <FormGrid> on desktop. */
  full?: boolean
}

/**
 * Grid-friendly text field: same look as the auth `Field`, but with no bottom
 * margin — spacing comes from the enclosing <FormGrid>.
 */
export const Field = forwardRef<HTMLInputElement, Props>(
  ({ label, id, error, full, className, ...props }, ref) => (
    <div data-field className={cn(full && 'md:col-span-2')}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]"
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[var(--radius-neo-md)] bg-[var(--color-neo-bg)] px-3 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none transition focus:ring-2 focus:ring-[var(--color-neo-primary)]/40 focus:ring-offset-1 focus:ring-offset-[var(--color-neo-bg)]',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[var(--color-neo-danger)]">{error}</p>}
    </div>
  ),
)
Field.displayName = 'FormField'
