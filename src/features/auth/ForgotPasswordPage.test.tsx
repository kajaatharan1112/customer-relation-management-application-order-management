import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { sendPasswordReset } = vi.hoisted(() => ({
  sendPasswordReset: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { sendPasswordReset },
}))

import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import { ToastProvider } from '@/shared/ui/Toast'

describe('ForgotPasswordPage', () => {
  it('sends a reset email and shows the check-your-email message', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ForgotPasswordPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@roe.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(sendPasswordReset).toHaveBeenCalledWith('jane@roe.com')
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows the same check-your-email message even for an unknown address', async () => {
    sendPasswordReset.mockResolvedValueOnce({ data: {}, error: { message: 'User not found' } })
    render(
      <MemoryRouter>
        <ToastProvider>
          <ForgotPasswordPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText(/email/i), 'nobody@roe.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })
})
