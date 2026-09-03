import {
  bucketOf, progressFromBucket, isOverdue, matchesFilter,
} from '@/shared/constants/billStatus'

describe('billStatus', () => {
  it('maps known status keys to buckets', () => {
    expect(bucketOf('pending')).toBe('open')
    expect(bucketOf('in_progress')).toBe('active')
    expect(bucketOf('active')).toBe('active')
    expect(bucketOf('completed')).toBe('done')
    expect(bucketOf('paid')).toBe('done')
  })

  it('falls back to open for unknown keys', () => {
    expect(bucketOf('weird_custom_status')).toBe('open')
  })

  it('derives coarse progress from the bucket', () => {
    expect(progressFromBucket('pending')).toBe(0)
    expect(progressFromBucket('active')).toBe(60)
    expect(progressFromBucket('completed')).toBe(100)
  })

  it('isOverdue: past deadline and not done', () => {
    const now = new Date('2026-09-02T10:00:00')
    expect(isOverdue({ deadline: '2026-08-30', statusKey: 'active' }, now)).toBe(true)
    expect(isOverdue({ deadline: '2026-09-30', statusKey: 'active' }, now)).toBe(false)
    expect(isOverdue({ deadline: '2026-08-30', statusKey: 'completed' }, now)).toBe(false)
    expect(isOverdue({ deadline: null, statusKey: 'active' }, now)).toBe(false)
  })

  it('matchesFilter', () => {
    const now = new Date('2026-09-02T10:00:00')
    const b = { deadline: '2026-08-30', statusKey: 'active' as const }
    expect(matchesFilter(b, 'all', now)).toBe(true)
    expect(matchesFilter(b, 'active', now)).toBe(true)
    expect(matchesFilter(b, 'open', now)).toBe(false)
    expect(matchesFilter(b, 'overdue', now)).toBe(true)
  })
})
