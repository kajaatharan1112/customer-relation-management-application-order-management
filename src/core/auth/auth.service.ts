import { supabase } from '@/core/supabase/client'

const redirect = (path: string) => `${window.location.origin}${path}`

export const authService = {
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect('/auth/callback') },
    }),

  signUpWithPassword: (email: string, password: string, fullName: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, user_type: 'customer' },
        emailRedirectTo: redirect('/auth/callback'),
      },
    }),

  sendPasswordReset: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect('/reset-password') }),

  updatePassword: (password: string) => supabase.auth.updateUser({ password }),

  /** Confirms the 6-digit code emailed for a self-signup or an admin invite. */
  verifyEmailOtp: (email: string, token: string, type: 'signup' | 'invite') =>
    supabase.auth.verifyOtp({ email, token, type }),

  /** Re-sends the signup confirmation code (invite codes are re-sent by an admin). */
  resendSignupOtp: (email: string) => supabase.auth.resend({ type: 'signup', email }),

  signOut: () => supabase.auth.signOut(),
}
