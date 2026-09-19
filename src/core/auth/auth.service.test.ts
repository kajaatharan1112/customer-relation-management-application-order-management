import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: { auth: h },
}))

import { authService } from '@/core/auth/auth.service'

describe('authService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signInWithPassword forwards email and password', async () => {
    await authService.signInWithPassword('jane@roe.com', 'secret123')
    expect(h.signInWithPassword).toHaveBeenCalledWith({ email: 'jane@roe.com', password: 'secret123' })
  })

  it('signInWithGoogle requests the google provider with a callback redirect', async () => {
    await authService.signInWithGoogle()
    expect(h.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  })

  it('sendSignupOtp requests a code with no password, creating the user if needed', async () => {
    await authService.sendSignupOtp('jane@roe.com', 'Jane Roe')
    expect(h.signInWithOtp).toHaveBeenCalledWith({
      email: 'jane@roe.com',
      options: { shouldCreateUser: true, data: { full_name: 'Jane Roe' } },
    })
  })

  it('sendPasswordReset points the reset link at /reset-password', async () => {
    await authService.sendPasswordReset('jane@roe.com')
    expect(h.resetPasswordForEmail).toHaveBeenCalledWith('jane@roe.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  })

  it('updatePassword forwards the new password', async () => {
    await authService.updatePassword('newSecret123')
    expect(h.updateUser).toHaveBeenCalledWith({ password: 'newSecret123' })
  })

  it('signOut calls supabase sign out', async () => {
    await authService.signOut()
    expect(h.signOut).toHaveBeenCalled()
  })

  it('verifyEmailOtp forwards email, token, and type', async () => {
    await authService.verifyEmailOtp('jane@roe.com', '123456', 'email')
    expect(h.verifyOtp).toHaveBeenCalledWith({ email: 'jane@roe.com', token: '123456', type: 'email' })
  })

  it('verifyEmailOtp supports the invite type', async () => {
    await authService.verifyEmailOtp('jane@roe.com', '654321', 'invite')
    expect(h.verifyOtp).toHaveBeenCalledWith({ email: 'jane@roe.com', token: '654321', type: 'invite' })
  })
})
