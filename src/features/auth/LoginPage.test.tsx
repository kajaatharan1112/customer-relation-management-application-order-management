import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { signInWithPassword, signInWithGoogle } = vi.hoisted(() => ({
  signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signInWithGoogle: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@/core/auth/auth.service', () => ({
  authService: { signInWithPassword, signInWithGoogle },
}))
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ session: null, profile: null, loading: false }),
}))

import LoginPage from '@/features/auth/LoginPage'
import { ToastProvider } from '@/shared/ui/Toast'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <LoginPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('shows a validation error for an invalid email', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('submits valid credentials', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(signInWithPassword).toHaveBeenCalledWith('a@b.com', 'secret12')
  })
})
