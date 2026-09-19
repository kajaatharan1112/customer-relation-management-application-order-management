import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
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

  it('signUpWithPassword sends full name, customer type, and a callback redirect', async () => {
    await authService.signUpWithPassword('jane@roe.com', 'secret123', 'Jane Roe')
    expect(h.signUp).toHaveBeenCalledWith({
      email: 'jane@roe.com',
      password: 'secret123',
      options: {
        data: { full_name: 'Jane Roe', user_type: 'customer' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
})
