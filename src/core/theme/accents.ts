export type AccentKey =
  | 'indigo'
  | 'violet'
  | 'blue'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'red'
  | 'graphite'
  | 'black'

export interface Accent {
  key: AccentKey
  label: string
  /** Drives --color-neo-primary (solid buttons, focus rings, links). */
  base: string
  /** Drives --color-neo-primary-2 (the gradient companion on avatars/logo). */
  companion: string
}

/**
 * The 10 selectable accents. `indigo` is the default and maps to the colours
 * the app shipped with, so existing users see no change.
 *
 * KEEP IN SYNC with the inline map in `index.html` (pre-paint accent script).
 */
export const ACCENTS: Accent[] = [
  { key: 'indigo', label: 'Indigo', base: '#5A7BFF', companion: '#8B5CF6' },
  { key: 'violet', label: 'Violet', base: '#7C3AED', companion: '#A855F7' },
  { key: 'blue', label: 'Blue', base: '#2563EB', companion: '#3B82F6' },
  { key: 'teal', label: 'Teal', base: '#0D9488', companion: '#14B8A6' },
  { key: 'emerald', label: 'Emerald', base: '#059669', companion: '#10B981' },
  { key: 'amber', label: 'Amber', base: '#B45309', companion: '#D97706' },
  { key: 'rose', label: 'Rose', base: '#E11D48', companion: '#F43F5E' },
  { key: 'red', label: 'Red', base: '#DC2626', companion: '#EF4444' },
  { key: 'graphite', label: 'Gray', base: '#4B5563', companion: '#6B7280' },
  { key: 'black', label: 'Black', base: '#1F2937', companion: '#374151' },
]

export const ACCENT_KEYS: AccentKey[] = ACCENTS.map((a) => a.key)

export const DEFAULT_ACCENT: AccentKey = 'indigo'

/** Resolve a stored key to an Accent, falling back to the default for junk. */
export function accentByKey(key: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.key === key) ?? ACCENTS[0]
}
