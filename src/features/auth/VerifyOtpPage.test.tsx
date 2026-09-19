import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { verifyEmailOtp, resendSignupOtp } = vi.hoisted(() => ({
  verifyEmailOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  resendSignupOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { verifyEmailOtp, resendSignupOtp },
}))

import VerifyOtpPage from '@/features/auth/VerifyOtpPage'
import { ToastProvider } from '@/shared/ui/Toast'

function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path.split('?')[0], search: path.split('?')[1] ? `?${path.split('?')[1]}` : '', state }]}>
      <ToastProvider>
        <Routes>
          <Route path="/verify-email" element={<VerifyOtpPage />} />
          <Route path="/" element={<div>dashboard screen</div>} />
          <Route path="/reset-password" element={<div>reset password screen</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('VerifyOtpPage', () => {
  it('signup type: pre-fills email from router state, verifies, routes to dashboard', async () => {
    renderAt('/verify-email?type=signup', { email: 'jane@roe.com' })
    expect(screen.getByLabelText(/email/i)).toHaveValue('jane@roe.com')
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }))
    expect(verifyEmailOtp).toHaveBeenCalledWith('jane@roe.com', '123456', 'signup')
    expect(await screen.findByText('dashboard screen')).toBeInTheDocument()
  })

  it('invite type: blank email by default, verifies, routes to reset-password', async () => {
    renderAt('/verify-email?type=invite')
    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    await userEvent.type(screen.getByLabelText(/email/i), 'staff@onevo.test')
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '654321')
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }))
    expect(verifyEmailOtp).toHaveBeenCalledWith('staff@onevo.test', '654321', 'invite')
    expect(await screen.findByText('reset password screen')).toBeInTheDocument()
  })

  it('invite type: shows an ask-your-admin note instead of a resend button', () => {
    renderAt('/verify-email?type=invite')
    expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument()
    expect(screen.getByText(/ask your admin to resend/i)).toBeInTheDocument()
  })

  it('signup type: resend button requests a new code', async () => {
    renderAt('/verify-email?type=signup', { email: 'jane@roe.com' })
    await userEvent.click(screen.getByRole('button', { name: /resend code/i }))
    expect(resendSignupOtp).toHaveBeenCalledWith('jane@roe.com')
  })

  it('shows an error toast when verification fails', async () => {
    verifyEmailOtp.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid code' } })
    renderAt('/verify-email?type=signup', { email: 'jane@roe.com' })
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }))
    expect(await screen.findByText(/could not verify/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
  })
})
