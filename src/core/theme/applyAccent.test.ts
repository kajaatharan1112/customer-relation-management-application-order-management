import { describe, it, expect, beforeEach } from 'vitest'
import { applyAccent, ACCENT_STORAGE_KEY } from './applyAccent'

describe('applyAccent', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--color-neo-primary')
    document.documentElement.style.removeProperty('--color-neo-primary-2')
    localStorage.clear()
  })

  it('sets both custom properties and persists the key', () => {
    applyAccent('emerald')
    const root = document.documentElement
    expect(root.style.getPropertyValue('--color-neo-primary')).toBe('#059669')
    expect(root.style.getPropertyValue('--color-neo-primary-2')).toBe('#10B981')
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('emerald')
  })

  it('falls back to the default for an invalid key', () => {
    // @ts-expect-error deliberately invalid
    applyAccent('bogus')
    expect(document.documentElement.style.getPropertyValue('--color-neo-primary')).toBe('#5A7BFF')
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('indigo')
  })
})
