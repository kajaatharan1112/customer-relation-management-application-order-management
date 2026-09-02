import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/app/providers/AuthProvider')
})

describe('ProtectedRoute', () => {
  it('redirects to /login without a session', async () => {
    vi.resetModules()
    vi.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({ session: null, profile: null, loading: false }),
    }))
    const { ProtectedRoute } = await import('@/app/router/ProtectedRoute')
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>secret</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders the outlet with a session', async () => {
    vi.resetModules()
    vi.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({ session: { user: { id: '1' } }, profile: null, loading: false }),
    }))
    const { ProtectedRoute } = await import('@/app/router/ProtectedRoute')
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>secret</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})
