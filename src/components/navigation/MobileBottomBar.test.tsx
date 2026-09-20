import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar'
import { mobileNavFor } from '@/components/navigation/navConfig'
import { useRole } from '@/core/auth/auth.hooks'

vi.mock('@/core/auth/auth.hooks', () => ({ useRole: vi.fn() }))

const mockUseRole = vi.mocked(useRole)

it('renders exactly the 4 staff tabs for a non-admin, current route active', () => {
  mockUseRole.mockReturnValue({ isAdmin: false, isStaff: true, isCustomer: false, profile: null, loading: false })
  render(
    <MemoryRouter initialEntries={['/bills']}>
      <MobileBottomBar />
    </MemoryRouter>,
  )
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(mobileNavFor(false).length)
  expect(links).toHaveLength(4)
  expect(screen.getByRole('link', { name: /bills/i })).toHaveAttribute('aria-current', 'page')
})

it('renders a 5th Settings tab for an admin', () => {
  mockUseRole.mockReturnValue({ isAdmin: true, isStaff: true, isCustomer: false, profile: null, loading: false })
  render(
    <MemoryRouter initialEntries={['/bills']}>
      <MobileBottomBar />
    </MemoryRouter>,
  )
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(5)
  expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
})
