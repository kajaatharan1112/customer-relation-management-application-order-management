import { describe, it, expect } from 'vitest'
import { relativeTime } from '@/shared/utils/relativeTime'

describe('relativeTime', () => {
  it('says just now for <60s', () => {
    expect(relativeTime(new Date().toISOString())).toBe('just now')
  })
  it('says Nm ago', () => {
    const t = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(relativeTime(t)).toBe('5m ago')
  })
})
