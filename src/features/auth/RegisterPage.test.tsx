import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { signUpWithPassword } = vi.hoisted(() => ({
  signUpWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { signUpWithPassword, signInWithGoogle: vi.fn() },
}))
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ session: null, profile: null, loading: false }),
}))

import RegisterPage from '@/features/auth/RegisterPage'
import { ToastProvider } from '@/shared/ui/Toast'

describe('RegisterPage', () => {
  it('submits name, email, password, then routes to the OTP verify page', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <ToastProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<div>verify screen</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Roe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@roe.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(signUpWithPassword).toHaveBeenCalledWith('jane@roe.com', 'secret12', 'Jane Roe')
    expect(await screen.findByText('verify screen')).toBeInTheDocument()
  })
})
