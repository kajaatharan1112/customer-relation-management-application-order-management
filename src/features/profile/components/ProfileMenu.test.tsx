import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileMenu, initialsFrom } from '@/features/profile/components/ProfileMenu'

const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  signOut: vi.fn(),
  profile: { fullName: 'Kaja Atharan', email: 'kaja@example.com', themeColor: 'indigo' } as
    | { fullName: string; email: string; themeColor: string }
    | null,
}))

vi.mock('@/app/providers/AuthProvider', () => ({ useAuth: () => ({ profile: h.profile }) }))
vi.mock('@/features/profile/mutations/useUpdateAccent', () => ({
  useUpdateAccent: () => ({ mutate: h.mutate }),
}))
vi.mock('@/core/auth/auth.service', () => ({ authService: { signOut: h.signOut } }))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))
vi.mock('@/features/profile/components/ProfileFormModal', () => ({
  ProfileFormModal: () => <div>edit-profile-modal</div>,
}))

describe('initialsFrom', () => {
  it('takes first + last initial, falls back to email', () => {
    expect(initialsFrom('Kaja Atharan', 'x@y.com')).toBe('KA')
    expect(initialsFrom('Kaja', 'x@y.com')).toBe('K')
    expect(initialsFrom('', 'zed@y.com')).toBe('Z')
  })
})

describe('ProfileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.profile = { fullName: 'Kaja Atharan', email: 'kaja@example.com', themeColor: 'indigo' }
  })

  it('renders nothing without a profile', () => {
    h.profile = null
    const { container } = render(<ProfileMenu />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows identity and 10 swatches when opened', async () => {
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByText('kaja@example.com')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /theme$/ })).toHaveLength(10)
  })

  it('clicking a swatch persists that accent', async () => {
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Emerald theme' }))
    expect(h.mutate).toHaveBeenCalledWith('emerald', expect.any(Object))
  })

  it('sign out calls the auth service', async () => {
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(h.signOut).toHaveBeenCalledOnce()
  })

  it('Edit profile opens the modal', async () => {
    render(<ProfileMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit profile' }))
    expect(screen.getByText('edit-profile-modal')).toBeInTheDocument()
  })
})
