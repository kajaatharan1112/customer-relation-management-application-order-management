import { describe, it, expect } from 'vitest'
import { formatBytes } from '@/shared/utils/formatBytes'

describe('formatBytes', () => {
  it('formats', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5_242_880)).toBe('5 MB')
  })
})
