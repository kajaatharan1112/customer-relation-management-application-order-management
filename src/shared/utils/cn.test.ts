import { describe, it, expect } from 'vitest'
import { cn } from '@/shared/utils/cn'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false, 'b', undefined, 'c')).toBe('a b c')
  })
  it('dedupes conflicting tailwind classes, last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
