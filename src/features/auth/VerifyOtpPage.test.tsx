import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { verifyEmailOtp } = vi.hoisted(() => ({
  verifyEmailOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { verifyEmailOtp },
}))

import VerifyOtpPage from '@/features/auth/VerifyOtpPage'
import { ToastProvider } from '@/shared/ui/Toast'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/verify-email']}>
      <ToastProvider>
        <Routes>
          <Route path="/verify-email" element={<VerifyOtpPage />} />
          <Route path="/reset-password" element={<div>reset password screen</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('VerifyOtpPage', () => {
  it('verifies the invite email + code, then routes to reset-password', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'staff@onevo.test')
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '654321')
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }))
    expect(verifyEmailOtp).toHaveBeenCalledWith('staff@onevo.test', '654321', 'invite')
    expect(await screen.findByText('reset password screen')).toBeInTheDocument()
  })

  it('shows an error toast when verification fails', async () => {
    verifyEmailOtp.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid code' } })
    renderPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'staff@onevo.test')
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }))
    expect(await screen.findByText(/could not verify/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
  })
})
