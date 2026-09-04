import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({
  applyAccent: vi.fn(),
  setAccent: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/core/theme/applyAccent', () => ({ applyAccent: h.applyAccent }))
vi.mock('@/features/profile/data/profile.repository', () => ({
  profileRepository: { setAccent: h.setAccent },
}))
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { themeColor: 'indigo' }, refreshProfile: h.refreshProfile }),
}))

import { useUpdateAccent } from '@/features/profile/mutations/useUpdateAccent'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useUpdateAccent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies the accent immediately and persists it', async () => {
    const { result } = renderHook(() => useUpdateAccent(), { wrapper })
    await result.current.mutateAsync('rose')
    expect(h.applyAccent).toHaveBeenCalledWith('rose')
    expect(h.setAccent).toHaveBeenCalledWith('rose')
    await waitFor(() => expect(h.refreshProfile).toHaveBeenCalled())
  })

  it('rolls back to the current accent on failure', async () => {
    h.setAccent.mockRejectedValueOnce(new Error('nope'))
    const { result } = renderHook(() => useUpdateAccent(), { wrapper })
    await expect(result.current.mutateAsync('rose')).rejects.toThrow('nope')
    expect(h.applyAccent).toHaveBeenNthCalledWith(1, 'rose')
    expect(h.applyAccent).toHaveBeenNthCalledWith(2, 'indigo')
  })
})
