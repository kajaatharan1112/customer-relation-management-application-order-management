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

  /**
   * Sends a 6-digit signup code to `email` — no password needed yet, so this
   * can run the moment the user has typed just their name + email. Also used
   * to resend: calling it again for the same still-unconfirmed email just
   * re-sends a fresh code instead of erroring.
   */
  sendSignupOtp: (email: string, fullName: string) =>
    supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { full_name: fullName } },
    }),

  sendPasswordReset: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect('/reset-password') }),

  updatePassword: (password: string) => supabase.auth.updateUser({ password }),

  /** Confirms the 6-digit code emailed for a self-signup (sendSignupOtp) or an admin invite. */
  verifyEmailOtp: (email: string, token: string, type: 'email' | 'invite') =>
    supabase.auth.verifyOtp({ email, token, type }),

  signOut: () => supabase.auth.signOut(),
}
