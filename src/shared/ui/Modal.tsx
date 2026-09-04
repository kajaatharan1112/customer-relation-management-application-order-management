import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/shared/utils/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  /** `sm` (default) keeps the old narrow box; `lg` is the wide two-column form frame. */
  size?: 'sm' | 'lg'
  /** Pinned footer region — typically a <FormActions> row. */
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, className, size = 'sm', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const width = size === 'lg' ? 'max-w-[920px]' : 'max-w-lg'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[var(--radius-neo-large)] bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-floating)] md:max-h-[85vh]',
              width,
              className,
            )}
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <h2 className="shrink-0 px-6 pt-6 pb-4 text-lg font-bold text-[var(--color-neo-text-primary)]">
                {title}
              </h2>
            )}
            <div
              data-modal-body
              className={cn('min-h-0 flex-1 overflow-y-auto px-6 pb-6', !title && 'pt-6')}
            >
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-black/5 bg-[var(--color-neo-card)] px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
