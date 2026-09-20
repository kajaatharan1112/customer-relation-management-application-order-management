// admin-verify-invite — an admin_member finishes onboarding a walk-in
// customer/employee/admin in person: the invitee reads out the 6-digit code
// from their invite email, the admin types it (+ a password) into the same
// form, and this confirms the account right there.
//
// Why this can't just be a client-side supabase.auth.verifyOtp() call: that
// signs the *caller's own browser* in as whoever the code belongs to — it
// would silently replace the admin's session with the new account's. Instead
// we verify the OTP against a throwaway client that's never persisted or
// returned to the browser, then set the password with the service role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Identify the caller (the admin) from their bearer token.
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: uErr } = await caller.auth.getUser()
  if (uErr || !userData.user) return json({ error: 'invalid token' }, 401)

  const { data: profileRow } = await caller
    .from('profiles')
    .select('user_types(key)')
    .eq('id', userData.user.id)
    .single()
  const callerType =
    (profileRow as { user_types?: { key?: string } } | null)?.user_types?.key
  if (callerType !== 'admin_member') return json({ error: 'forbidden' }, 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const email = String(body.email ?? '')
  const token = String(body.token ?? '')
  const password = String(body.password ?? '')

  if (!email || !token || !password) return json({ error: 'missing fields' }, 400)
  if (password.length < 8) return json({ error: 'password must be at least 8 characters' }, 400)

  // A fresh, never-persisted client — its session lives only in this
  // function's memory and is discarded when we return.
  const throwaway = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: verified, error: vErr } = await throwaway.auth.verifyOtp({
    email,
    token,
    type: 'invite',
  })
  if (vErr || !verified.user) {
    return json({ error: vErr?.message ?? 'Could not verify code' }, 400)
  }

  const admin = createClient(url, service)
  const { error: pwErr } = await admin.auth.admin.updateUserById(verified.user.id, { password })
  if (pwErr) return json({ error: pwErr.message }, 400)

  // Was created 'invited' by handle_new_auth_user (0015) — now confirmed.
  const { error: statusErr } = await admin
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', verified.user.id)
  if (statusErr) return json({ error: statusErr.message }, 400)

  return json({ ok: true, user_id: verified.user.id }, 200)
})
