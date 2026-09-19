import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { signUpWithPassword, resendSignupOtp, verifyEmailOtp } = vi.hoisted(() => ({
  signUpWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  resendSignupOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  verifyEmailOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { signUpWithPassword, resendSignupOtp, verifyEmailOtp, signInWithGoogle: vi.fn() },
}))
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ session: null, profile: null, loading: false }),
}))

import RegisterPage from '@/features/auth/RegisterPage'
import { ToastProvider } from '@/shared/ui/Toast'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <ToastProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>dashboard screen</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function fillBaseFields() {
  await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Roe')
  await userEvent.type(screen.getByLabelText(/^email/i), 'jane@roe.com')
  await userEvent.type(screen.getByLabelText(/^password/i), 'secret123')
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('has no OTP field or submit-enabled state until Send OTP succeeds', () => {
    renderPage()
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  it('Send OTP signs up with the form values and reveals the code field', async () => {
    renderPage()
    await fillBaseFields()
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    expect(signUpWithPassword).toHaveBeenCalledWith('jane@roe.com', 'secret123', 'Jane Roe')
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled()
  })

  it('does not send OTP when required fields are missing', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    expect(signUpWithPassword).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument()
  })

  it('clicking Send OTP again resends instead of signing up a second time', async () => {
    renderPage()
    await fillBaseFields()
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await screen.findByLabelText(/6-digit code/i)
    await userEvent.click(screen.getByRole('button', { name: /resend otp/i }))
    expect(resendSignupOtp).toHaveBeenCalledWith('jane@roe.com')
    expect(signUpWithPassword).toHaveBeenCalledTimes(1)
  })

  it('submitting the code verifies it and routes into the app', async () => {
    renderPage()
    await fillBaseFields()
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(verifyEmailOtp).toHaveBeenCalledWith('jane@roe.com', '123456', 'signup')
    expect(await screen.findByText('dashboard screen')).toBeInTheDocument()
  })
})
