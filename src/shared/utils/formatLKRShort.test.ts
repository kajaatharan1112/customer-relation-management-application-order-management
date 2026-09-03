import { formatLKRShort } from '@/shared/utils/formatLKRShort'

it('formats short LKR amounts', () => {
  expect(formatLKRShort(0)).toBe('LKR 0')
  expect(formatLKRShort(412_000)).toBe('LKR 412k')
  expect(formatLKRShort(5_240_000)).toBe('LKR 5.2M')
  expect(formatLKRShort(940_000)).toBe('LKR 940k')
  expect(formatLKRShort(1_500)).toBe('LKR 1.5k')
  expect(formatLKRShort(NaN)).toBe('LKR 0')
  expect(formatLKRShort(Infinity)).toBe('LKR 0')
})
