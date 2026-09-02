import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/shared/utils/formatCurrency'

describe('formatCurrency', () => {
  it('formats a number as LKR by default', () => {
    expect(formatCurrency(1500)).toMatch(/1,500/)
  })
  it('returns an em dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
  it('accepts a currency override', () => {
    expect(formatCurrency(10, { code: 'USD', locale: 'en-US' })).toContain('10')
  })
})
