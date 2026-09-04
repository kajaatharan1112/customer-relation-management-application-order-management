import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/providers/AuthProvider'
import { authService } from '@/core/auth/auth.service'
import { useToast } from '@/shared/ui/Toast'
import { ACCENTS } from '@/core/theme/accents'
import { useUpdateAccent } from '@/features/profile/mutations/useUpdateAccent'
import { ProfileFormModal } from '@/features/profile/components/ProfileFormModal'

export function initialsFrom(fullName: string, email: string): string {
  const name = fullName.trim()
  if (name) {
    const parts = name.split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
    return (first + last).toUpperCase()
  }
  return (email.trim()[0] ?? '?').toUpperCase()
}

export function ProfileMenu() {
  const { profile } = useAuth()
  const updateAccent = useUpdateAccent()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
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

  if (!profile) return null

  const initials = initialsFrom(profile.fullName, profile.email)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neo-primary)] text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-11 z-50 w-64 rounded-[var(--radius-neo-md)] bg-[var(--color-neo-card)] p-3 text-left shadow-[var(--shadow-neo-floating)]"
          >
            <div className="flex items-center gap-3 px-1 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-neo-primary)] text-xs font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-neo-text-primary)]">
                  {profile.fullName || 'Your account'}
                </p>
                <p className="truncate text-xs text-[var(--color-neo-text-secondary)]">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="border-t border-black/5 pt-3">
              <p className="mb-2 px-1 text-xs font-semibold text-[var(--color-neo-text-secondary)]">
                Theme color
              </p>
              <div className="grid grid-cols-5 gap-2 px-1">
                {ACCENTS.map((a) => {
                  const active = a.key === profile.themeColor
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() =>
                        updateAccent.mutate(a.key, {
                          onSuccess: () => show({ type: 'success', title: `Theme set to ${a.label}` }),
                          onError: () =>
                            show({ type: 'error', title: 'Could not save theme color' }),
                        })
                      }
                      aria-label={`${a.label} theme`}
                      aria-pressed={active}
                      title={a.label}
                      className={
                        'h-8 w-8 rounded-full transition-transform hover:scale-110 ' +
                        (active
                          ? 'ring-2 ring-[var(--color-neo-text-primary)] ring-offset-2 ring-offset-[var(--color-neo-card)]'
                          : '')
                      }
                      style={{ background: a.base }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="mt-3 border-t border-black/5 pt-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  setEditOpen(true)
                }}
                className="w-full rounded-[var(--radius-neo-sm)] px-2 py-2 text-left text-sm text-[var(--color-neo-text-primary)] hover:bg-[var(--color-neo-surface)]"
              >
                Edit profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => authService.signOut()}
                className="w-full rounded-[var(--radius-neo-sm)] px-2 py-2 text-left text-sm font-medium text-[var(--color-neo-danger)] hover:bg-[var(--color-neo-surface)]"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editOpen && <ProfileFormModal onClose={() => setEditOpen(false)} />}
    </div>
  )
}
