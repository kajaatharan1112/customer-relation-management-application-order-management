import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

type ToastKind = 'success' | 'error' | 'info'

interface ToastInput {
  type: ToastKind
  title: string
  message?: string
}

interface ToastItem extends ToastInput {
  id: number
}

const ToastCtx = createContext<{ show: (t: ToastInput) => void } | null>(null)

const barColor: Record<ToastKind, string> = {
  success: 'var(--color-neo-success)',
  error: 'var(--color-neo-danger)',
  info: 'var(--color-neo-primary)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const show = useCallback((t: ToastInput) => {
    const id = ++seq.current
    setItems((prev) => [...prev, { ...t, id }])
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed right-4 top-4 z-[60] flex flex-col gap-2">
          <AnimatePresence>
            {items.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="min-w-64 rounded-[var(--radius-neo-md)] border-l-4 bg-[var(--color-neo-card)] p-3 shadow-[var(--shadow-neo-floating)]"
                style={{ borderLeftColor: barColor[t.type] }}
              >
                <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-[var(--color-neo-text-secondary)]">{t.message}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
