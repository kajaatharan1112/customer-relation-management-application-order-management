import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

type UserType = 'admin_member' | 'employee' | 'customer'

function mockAuth(userType: UserType | null) {
  vi.doMock('@/app/providers/AuthProvider', () => ({
    useAuth: () => ({
      session: userType ? { user: { id: '1' } } : null,
      profile: userType
        ? { id: '1', userType, fullName: '', email: '', status: 'active' }
        : null,
      loading: false,
    }),
  }))
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/app/providers/AuthProvider')
})

describe('RoleRoute', () => {
  it('redirects a customer away from staff routes', async () => {
    vi.resetModules()
    mockAuth('customer')
    const { RoleRoute } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<RoleRoute allow="staff" />}>
            <Route path="/staff" element={<div>staff area</div>} />
          </Route>
          <Route path="/portal" element={<div>portal home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('portal home')).toBeInTheDocument()
  })

  it('lets staff into staff routes', async () => {
    vi.resetModules()
    mockAuth('admin_member')
    const { RoleRoute } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<RoleRoute allow="staff" />}>
            <Route path="/staff" element={<div>staff area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('staff area')).toBeInTheDocument()
  })

  it('redirects staff away from the customer portal', async () => {
    vi.resetModules()
    mockAuth('admin_member')
    const { RoleRoute } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/portal']}>
        <Routes>
          <Route element={<RoleRoute allow="customer" />}>
            <Route path="/portal" element={<div>portal area</div>} />
          </Route>
          <Route path="/" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('dashboard')).toBeInTheDocument()
  })

  it('allow="admin" lets an admin_member in', async () => {
    vi.resetModules()
    mockAuth('admin_member')
    const { RoleRoute } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allow="admin" />}>
            <Route path="/admin" element={<div>admin area</div>} />
          </Route>
          <Route path="/" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('admin area')).toBeInTheDocument()
  })

  it('allow="admin" redirects an employee to the dashboard', async () => {
    vi.resetModules()
    mockAuth('employee')
    const { RoleRoute } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allow="admin" />}>
            <Route path="/admin" element={<div>admin area</div>} />
          </Route>
          <Route path="/" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('dashboard')).toBeInTheDocument()
  })
})
