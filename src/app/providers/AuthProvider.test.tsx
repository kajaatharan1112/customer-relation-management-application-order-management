import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'

let sessionResult: { data: { session: unknown } } = { data: { session: null } }
let profileRow: { data: unknown; error: unknown } = { data: null, error: null }

vi.mock('@/core/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve(sessionResult)),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(profileRow),
          }),
        }),
      }),
    },
  }
})

function Probe() {
  const { loading, profile } = useAuth()
  if (loading) return <div>loading</div>
  if (!profile) return <div>anon</div>
  return <div>{`${profile.email}:${profile.themeColor}`}</div>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionResult = { data: { session: null } }
    profileRow = { data: null, error: null }
  })

  it('resolves to anon when there is no session', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument())
  })

  it('maps theme_color from the profile row onto the profile', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    profileRow = {
      data: {
        id: 'u1',
        full_name: 'Kaja',
        email: 'k@x.com',
        status: 'active',
        theme_color: 'teal',
        user_types: { key: 'admin_member' },
      },
      error: null,
    }
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('k@x.com:teal')).toBeInTheDocument())
  })

  it('falls back to indigo when theme_color is an unknown value', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    profileRow = {
      data: {
        id: 'u1',
        full_name: 'Kaja',
        email: 'k@x.com',
        status: 'active',
        theme_color: 'chartreuse',
        user_types: { key: 'admin_member' },
      },
      error: null,
    }
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('k@x.com:indigo')).toBeInTheDocument())
  })
})
