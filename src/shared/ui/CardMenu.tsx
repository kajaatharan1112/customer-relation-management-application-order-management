import { useEffect, useRef, useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

export interface CardMenuItem {
  label: string
  icon: ComponentType<{ size?: number }>
  onClick: () => void
  tone?: 'default' | 'danger'
}

/**
 * The "⋮" action menu used on list/grid cards (customers, bills, workflows,
 * order types, members…): click stops propagation so it never also triggers
 * the card's own onClick, closes on outside click/Escape.
 */
export function CardMenu({ items, label }: { items: CardMenuItem[]; label: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="rounded-full p-1.5 text-[var(--color-neo-text-secondary)] hover:bg-[var(--color-neo-surface)]"
      >
        <MoreVertical size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-9 z-20 w-40 rounded-[var(--radius-neo-md)] bg-[var(--color-neo-card)] p-1.5 shadow-[var(--shadow-neo-floating)]"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[var(--radius-neo-sm)] px-2 py-2 text-left text-xs font-semibold hover:bg-[var(--color-neo-surface)]',
                  item.tone === 'danger' ? 'text-[var(--color-neo-danger)]' : 'text-[var(--color-neo-primary)]',
                )}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
