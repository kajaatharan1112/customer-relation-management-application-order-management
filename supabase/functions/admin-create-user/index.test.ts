// Integration test: run `supabase functions serve admin-create-user` first, then
//   deno test --allow-net --allow-env supabase/functions/admin-create-user/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const BASE = Deno.env.get('FUNC_BASE') ?? 'http://127.0.0.1:54321/functions/v1'

Deno.test('rejects missing auth', async () => {
  const res = await fetch(`${BASE}/admin-create-user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'x@y.z',
      full_name: 'X',
      user_type: 'customer',
      temp_password: 'secret123',
    }),
  })
  assertEquals(res.status, 401)
  await res.body?.cancel()
})

Deno.test('rejects a non-admin caller', async () => {
  const token = Deno.env.get('FUNC_CUSTOMER_TOKEN')
  if (!token) return // skipped unless a customer access token is supplied
  const res = await fetch(`${BASE}/admin-create-user`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: 'x@y.z',
      full_name: 'X',
      user_type: 'customer',
      temp_password: 'secret123',
    }),
  })
  assertEquals(res.status, 403)
  await res.body?.cancel()
})
