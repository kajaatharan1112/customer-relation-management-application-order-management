// Integration test: run `supabase functions serve admin-set-user-ban` first, then
//   deno test --allow-net --allow-env supabase/functions/admin-set-user-ban/index.test.ts
// (No deno on the dev box today — the real coverage is e2e/settings-members.spec.ts,
//  where an admin disables a member and that member can no longer sign in.)
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const BASE = Deno.env.get('FUNC_BASE') ?? 'http://127.0.0.1:54321/functions/v1'

Deno.test('rejects missing auth', async () => {
  const res = await fetch(`${BASE}/admin-set-user-ban`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target_user_id: '00000000-0000-0000-0000-000000000001', banned: true }),
  })
  assertEquals(res.status, 401)
  await res.body?.cancel()
})

Deno.test('rejects a non-admin caller', async () => {
  const token = Deno.env.get('FUNC_CUSTOMER_TOKEN')
  if (!token) return // skipped unless a customer access token is supplied
  const res = await fetch(`${BASE}/admin-set-user-ban`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ target_user_id: '00000000-0000-0000-0000-000000000001', banned: true }),
  })
  assertEquals(res.status, 403)
  await res.body?.cancel()
})

Deno.test('rejects a missing target_user_id', async () => {
  const token = Deno.env.get('FUNC_ADMIN_TOKEN')
  if (!token) return // skipped unless an admin access token is supplied
  const res = await fetch(`${BASE}/admin-set-user-ban`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ banned: true }),
  })
  assertEquals(res.status, 400)
  await res.body?.cancel()
})
