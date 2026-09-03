// admin-set-user-ban — an authenticated admin_member bans (disables) or unbans
// (re-enables) another user's login. Runs with the service role; verifies the
// caller first. Paired with the set_member_status() RPC: the RPC flips the
// profile row + last-admin guard, this flips the auth-side ban.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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
  const callerType = (profileRow as { user_types?: { key?: string } } | null)?.user_types?.key
  if (callerType !== 'admin_member') return json({ error: 'forbidden' }, 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const targetUserId = String(body.target_user_id ?? '')
  const banned = body.banned === true
  if (!targetUserId) return json({ error: 'missing target_user_id' }, 400)

  const admin = createClient(url, service)
  const { error } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: banned ? '876000h' : 'none',
  })
  if (error) return json({ error: error.message }, 400)

  return json({ ok: true }, 200)
})
