import { accentByKey, type AccentKey } from '@/core/theme/accents'

export const ACCENT_STORAGE_KEY = 'onevo.accent'

/**
 * Override the accent custom properties on <html> and cache the choice so the
 * pre-paint script in index.html can restore it on the next load (no flash).
 */
export function applyAccent(key: AccentKey): void {
  const accent = accentByKey(key)
  const root = document.documentElement
  root.style.setProperty('--color-neo-primary', accent.base)
  root.style.setProperty('--color-neo-primary-2', accent.companion)
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent.key)
  } catch {
    /* storage unavailable (private mode / disabled) — the DB value still wins on load */
  }
}
