import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners: (() => void)[] = []
  const mql = {
    get matches() {
      return matches
    },
    media: '(max-width: 767px)',
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: () => void) => {
      const i = listeners.indexOf(cb)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return {
    set(value: boolean) {
      matches = value
      listeners.forEach((cb) => cb())
    },
  }
}

describe('useIsMobile', () => {
  it('reflects the initial match', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates when the media query changes', () => {
    const media = mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => media.set(true))
    expect(result.current).toBe(true)

    act(() => media.set(false))
    expect(result.current).toBe(false)
  })
})
