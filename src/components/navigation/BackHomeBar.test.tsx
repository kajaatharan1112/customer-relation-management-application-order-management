import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { BackHomeBar } from '@/components/navigation/BackHomeBar'
import { ROUTES } from '@/shared/constants/routes'

it('calls onBack for Back, and navigates to the home route for Home', async () => {
  const onBack = vi.fn()
  render(
    <MemoryRouter initialEntries={['/customers']}>
      <Routes>
        <Route path="/customers" element={<BackHomeBar onBack={onBack} />} />
        <Route path={ROUTES.home} element={<div>Home screen</div>} />
      </Routes>
    </MemoryRouter>,
  )

  await userEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onBack).toHaveBeenCalledOnce()
  expect(screen.queryByText('Home screen')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /home/i }))
  expect(screen.getByText('Home screen')).toBeInTheDocument()
})
