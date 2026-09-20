import { describe, it, expect, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'

const h = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@/core/supabase/client', () => ({
  supabase: { functions: { invoke: h.invoke } },
}))

import { inviteVerificationRepository } from '@/shared/data/inviteVerification.repository'

describe('inviteVerificationRepository.verify', () => {
  it('resolves when the edge function succeeds', async () => {
    h.invoke.mockResolvedValue({ data: { ok: true }, error: null })
    await expect(
      inviteVerificationRepository.verify({ email: 'a@x.co', token: '123456', password: 'password123' }),
    ).resolves.toBeUndefined()
    expect(h.invoke).toHaveBeenCalledWith('admin-verify-invite', {
      body: { email: 'a@x.co', token: '123456', password: 'password123' },
    })
  })

  it('surfaces the edge function response body message on a non-2xx error', async () => {
    const response = new Response(JSON.stringify({ error: 'Token has expired or is invalid' }), { status: 400 })
    h.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) })
    await expect(
      inviteVerificationRepository.verify({ email: 'a@x.co', token: '000000', password: 'password123' }),
    ).rejects.toThrow('Token has expired or is invalid')
  })

  it('falls back to the raw error when the body has no message', async () => {
    const response = new Response('not json', { status: 500 })
    const err = new FunctionsHttpError(response)
    h.invoke.mockResolvedValue({ data: null, error: err })
    await expect(
      inviteVerificationRepository.verify({ email: 'a@x.co', token: '000000', password: 'password123' }),
    ).rejects.toBe(err)
  })
})
