import { describe, it, expect } from 'vitest'
import { ACCENTS, ACCENT_KEYS, DEFAULT_ACCENT, accentByKey } from './accents'

describe('accents', () => {
  it('has 10 accents including graphite and black', () => {
    expect(ACCENTS).toHaveLength(10)
    expect(ACCENT_KEYS).toEqual(expect.arrayContaining(['graphite', 'black']))
  })

  it('default maps to the colours the app shipped with', () => {
    const d = accentByKey(DEFAULT_ACCENT)
    expect(d.base.toUpperCase()).toBe('#5A7BFF')
    expect(d.companion.toUpperCase()).toBe('#8B5CF6')
  })

  it('accentByKey falls back to indigo for junk or missing keys', () => {
    expect(accentByKey('nope').key).toBe('indigo')
    expect(accentByKey(null).key).toBe('indigo')
    expect(accentByKey(undefined).key).toBe('indigo')
  })
})
