import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Package } from 'lucide-react'
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
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-neo-primary)] to-[var(--color-neo-primary-2)] text-white shadow-[var(--shadow-neo-soft)]">
          <Package size={20} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-neo-text-primary)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-neo-text-secondary)]">{subtitle}</p>}
      </div>
      <div>{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-[var(--color-neo-text-secondary)]">{footer}</div>}
    </Card>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
  icon?: ReactNode
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, error, className, icon, type, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const isPassword = type === 'password'
    return (
      <div className="mb-4">
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--color-neo-text-primary)]">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neo-text-secondary)]">
              {icon}
            </span>
          )}
          <input
            id={id}
            ref={ref}
            type={isPassword ? (visible ? 'text' : 'password') : type}
            className={cn(
              'h-11 w-full rounded-[var(--radius-neo-md)] bg-[var(--color-neo-bg)] text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none transition focus:ring-2 focus:ring-[var(--color-neo-primary)]/40 focus:ring-offset-1 focus:ring-offset-[var(--color-neo-bg)]',
              icon ? 'pl-10' : 'px-3',
              isPassword ? 'pr-10' : 'pr-3',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide' : 'Show'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-neo-text-secondary)] transition hover:text-[var(--color-neo-text-primary)]"
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[var(--color-neo-danger)]">{error}</p>}
      </div>
    )
  },
)
Field.displayName = 'Field'

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-[var(--color-neo-primary)] hover:underline">
      {children}
    </Link>
  )
}
