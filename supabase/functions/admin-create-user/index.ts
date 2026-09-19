// admin-create-user — an authenticated admin_member creates a new user and
// Supabase emails them an invite link to set their own password. Runs with
// the service role; verifies the caller first.
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

  // Identify the caller from their bearer token.
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
  const fullName = String(body.full_name ?? '')
  const phone = body.phone == null ? null : String(body.phone)
  const userType = String(body.user_type ?? '')
  const redirectTo = body.redirect_to == null ? undefined : String(body.redirect_to)

  if (!email || !fullName || !userType) {
    return json({ error: 'missing fields' }, 400)
  }
  if (!['admin_member', 'employee', 'customer'].includes(userType)) {
    return json({ error: 'bad user_type' }, 400)
  }

  const admin = createClient(url, service)
  const { data: created, error: cErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      user_type: userType,
      full_name: fullName,
      phone,
      created_by: userData.user.id,
    },
    redirectTo,
  })
  if (cErr || !created.user) {
    return json({ error: cErr?.message ?? 'create failed' }, 400)
  }

  return json({ user_id: created.user.id }, 200)
})
