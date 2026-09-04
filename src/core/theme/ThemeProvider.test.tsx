import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'

let mockProfile: { themeColor: string } | null = null
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: mockProfile }),
}))

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockProfile = null
    document.documentElement.style.removeProperty('--color-neo-primary')
  })

  it('applies the profile accent to <html>', () => {
    mockProfile = { themeColor: 'teal' }
    render(<ThemeProvider>x</ThemeProvider>)
    expect(document.documentElement.style.getPropertyValue('--color-neo-primary')).toBe('#0D9488')
    expect(document.documentElement.style.getPropertyValue('--color-neo-primary-2')).toBe('#14B8A6')
  })

  it('does nothing when there is no profile', () => {
    render(<ThemeProvider>x</ThemeProvider>)
    expect(document.documentElement.style.getPropertyValue('--color-neo-primary')).toBe('')
  })
})
