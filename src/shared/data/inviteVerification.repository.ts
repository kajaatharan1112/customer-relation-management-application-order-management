import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase/client'

export const inviteVerificationRepository = {
  /**
   * Admin-side "in person" verification: the invitee reads out their 6-digit
   * invite code, the admin types it (+ a password for them) here. Runs
   * server-side so it never swaps the admin's own browser session for the
   * invitee's — see supabase/functions/admin-verify-invite.
   */
  async verify(input: { email: string; token: string; password: string }): Promise<void> {
    const { error } = await supabase.functions.invoke('admin-verify-invite', {
      body: { email: input.email, token: input.token, password: input.password },
    })
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null)
        if (body?.error) throw new Error(body.error)
      }
      throw error
    }
  },
}
