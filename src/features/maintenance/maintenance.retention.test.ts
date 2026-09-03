import { defaultCutoff, clampCutoff, isBillEligible } from '@/features/maintenance/maintenance.retention'

const today = new Date('2026-09-03T12:00:00')

it('defaultCutoff is 12 months back', () => {
  expect(defaultCutoff(today)).toBe('2025-09-03')
})

it('clampCutoff cannot exceed 18 months back', () => {
  expect(clampCutoff('2026-06-01', today)).toBe('2025-03-03') // clamped to 18mo
  expect(clampCutoff('2024-01-01', today)).toBe('2024-01-01') // already older -> unchanged
})

it('isBillEligible: done + older than cutoff', () => {
  const c = '2025-09-03'
  expect(isBillEligible({ orderDate: '2025-01-01', statusKey: 'completed' }, c)).toBe(true)
  expect(isBillEligible({ orderDate: '2026-01-01', statusKey: 'completed' }, c)).toBe(false) // too new
  expect(isBillEligible({ orderDate: '2024-01-01', statusKey: 'pending' }, c)).toBe(false) // not done
  expect(isBillEligible({ orderDate: '2024-01-01', statusKey: 'paid' }, c)).toBe(true) // paid is also done
})
