import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { updatePassword } = vi.hoisted(() => ({
  updatePassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { updatePassword },
}))

import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import { ToastProvider } from '@/shared/ui/Toast'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ResetPasswordPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  it('rejects mismatched passwords without calling updatePassword', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/^new password/i), 'secret123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different1')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('updates the password and shows a success toast on match', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/^new password/i), 'secret123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(updatePassword).toHaveBeenCalledWith('secret123')
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })

  it('shows an error toast when updatePassword fails', async () => {
    updatePassword.mockResolvedValueOnce({ data: {}, error: { message: 'Link expired' } })
    renderPage()
    await userEvent.type(screen.getByLabelText(/^new password/i), 'secret123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/could not update password/i)).toBeInTheDocument()
    expect(screen.getByText(/link expired/i)).toBeInTheDocument()
  })
})
