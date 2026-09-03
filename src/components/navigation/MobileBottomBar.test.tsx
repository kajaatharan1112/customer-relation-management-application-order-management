import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar'
import { MOBILE_NAV } from '@/components/navigation/navConfig'

it('renders exactly the 4 staff tabs with the current route active', () => {
  render(
    <MemoryRouter initialEntries={['/bills']}>
      <MobileBottomBar />
    </MemoryRouter>,
  )
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(MOBILE_NAV.length)
  expect(links).toHaveLength(4)
  expect(screen.getByRole('link', { name: /bills/i })).toHaveAttribute('aria-current', 'page')
})
