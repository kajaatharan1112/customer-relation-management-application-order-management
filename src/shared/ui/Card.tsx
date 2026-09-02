import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

type CardVariant = 'soft' | 'inset' | 'floating'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  soft: 'bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] border border-white/40',
  inset: 'bg-[var(--color-neo-surface)] shadow-[var(--shadow-neo-pressed)]',
  floating: 'bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-floating)] border border-white/60',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'soft', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-neo-large)] text-[var(--color-neo-text-primary)]',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-[var(--color-neo-text-secondary)]', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'
