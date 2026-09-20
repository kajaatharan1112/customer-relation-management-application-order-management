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
    // handle_new_auth_user (0015) reads this to mark the profile 'invited':
    // GoTrue sets auth.users.invited_at in a step after the row insert that
    // fires the trigger, so it isn't visible yet at that point — this flag,
    // part of the same invite call's user_metadata, is.
    data: { full_name: fullName, phone, invited_by_admin: true },
    redirectTo,
  })
  if (cErr || !created.user) {
    return json({ error: cErr?.message ?? 'create failed' }, 400)
  }

  // user_type/created_by go in app_metadata, not the invite's user_metadata:
  // app_metadata can only be written via this service-role Admin API call,
  // never by the user themselves — that's what stops a public signUp from
  // granting itself a role (see migration 0013).
  const { error: mErr } = await admin.auth.admin.updateUserById(created.user.id, {
    app_metadata: { user_type: userType, created_by: userData.user.id },
  })
  if (mErr) {
    return json({ error: mErr.message }, 400)
  }

  // handle_new_auth_user() (0013) reads app_metadata.user_type at the
  // auth.users INSERT that inviteUserByEmail just did — before the
  // updateUserById above ever ran — so it always inserted this profile as
  // 'customer' (plus a customers row). Re-stamp the real type now, and drop
  // that row if this account isn't actually a customer.
  const { data: typeRow, error: typeErr } = await admin
    .from('user_types')
    .select('id')
    .eq('key', userType)
    .single()
  if (typeErr || !typeRow) {
    return json({ error: typeErr?.message ?? 'unknown user_type' }, 400)
  }
  const { error: fixTypeErr } = await admin
    .from('profiles')
    .update({ user_type_id: typeRow.id })
    .eq('id', created.user.id)
  if (fixTypeErr) {
    return json({ error: fixTypeErr.message }, 400)
  }
  if (userType !== 'customer') {
    const { error: dropErr } = await admin.from('customers').delete().eq('profile_id', created.user.id)
    if (dropErr) {
      return json({ error: dropErr.message }, 400)
    }
  }

  return json({ user_id: created.user.id }, 200)
})
