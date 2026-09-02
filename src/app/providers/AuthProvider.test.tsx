import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'

vi.mock('@/core/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    },
  }
})

function Probe() {
  const { loading, profile } = useAuth()
  return <div>{loading ? 'loading' : profile ? profile.email : 'anon'}</div>
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks())
  it('resolves to anon when there is no session', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument())
  })
})
