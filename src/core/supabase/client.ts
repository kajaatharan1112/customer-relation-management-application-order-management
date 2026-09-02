import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/core/supabase/database.types'
import { env } from '@/core/config/env'

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE: the OAuth redirect carries a one-time code that is only usable with
    // the code_verifier this browser generated and stored — the CSRF-style
    // protection for the login redirect. (Email/password sign-in is a direct
    // credentialed API call returning a bearer JWT, so it has no CSRF surface.)
    flowType: 'pkce',
  },
})
