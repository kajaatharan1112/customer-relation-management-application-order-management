import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/shared/ui/Card'
import { cn } from '@/shared/utils/cn'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Card variant="floating" className="p-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-neo-text-primary)]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-[var(--color-neo-text-secondary)]">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-[var(--color-neo-text-secondary)]">{footer}</div>}
    </Card>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, error, className, ...props }, ref) => (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] px-3 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none transition focus:ring-2 focus:ring-[var(--color-neo-primary)]',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[var(--color-neo-danger)]">{error}</p>}
    </div>
  ),
)
Field.displayName = 'Field'

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-[var(--color-neo-primary)] hover:underline">
      {children}
    </Link>
  )
}
