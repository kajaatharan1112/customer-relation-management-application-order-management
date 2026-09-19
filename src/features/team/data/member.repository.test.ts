import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn(),
  eq: vi.fn().mockResolvedValue({ error: null }),
  invoke: vi.fn().mockResolvedValue({ data: { user_id: 'u-new' }, error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      update: vi.fn(() => ({ eq: h.eq })),
    })),
    functions: { invoke: h.invoke },
    rpc: h.rpc,
    auth: { getUser: h.getUser },
  },
}))

import { memberRepository } from '@/features/team/data/member.repository'

describe('memberRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps profile rows to MemberVM and flags isSelf', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'me' } } })
    h.order.mockResolvedValue({
      data: [
        { id: 'me', full_name: 'Ava', email: 'ava@x.co', phone: null, status: 'active', created_at: '2026-01-01', user_types: { key: 'admin_member' } },
        { id: 'u2', full_name: 'Bo', email: 'bo@x.co', phone: '77', status: 'disabled', created_at: '2026-02-02', user_types: { key: 'admin_member' } },
      ],
      error: null,
    })
    const out = await memberRepository.list('admin_member')
    expect(out[0]).toMatchObject({ profileId: 'me', role: 'admin_member', status: 'active', isSelf: true })
    expect(out[1]).toMatchObject({ profileId: 'u2', isSelf: false, phone: '77' })
  })

  it('create posts the admin-create-user body with the role and a redirect', async () => {
    await memberRepository.create({ fullName: 'Sam', email: 's@x.co', phone: '1', role: 'employee' })
    expect(h.invoke).toHaveBeenCalledWith('admin-create-user', {
      body: {
        email: 's@x.co',
        full_name: 'Sam',
        phone: '1',
        user_type: 'employee',
        redirect_to: `${window.location.origin}/reset-password`,
      },
    })
  })

  it('setStatus calls the RPC then the ban function in order', async () => {
    await memberRepository.setStatus('u2', 'disabled')
    expect(h.rpc).toHaveBeenCalledWith('set_member_status', { p_profile_id: 'u2', p_status: 'disabled' })
    expect(h.invoke).toHaveBeenCalledWith('admin-set-user-ban', { body: { target_user_id: 'u2', banned: true } })
  })

  it('setStatus active -> banned false', async () => {
    await memberRepository.setStatus('u2', 'active')
    expect(h.invoke).toHaveBeenCalledWith('admin-set-user-ban', { body: { target_user_id: 'u2', banned: false } })
  })

  it('propagates an RPC error and does not call the ban function', async () => {
    h.rpc.mockResolvedValueOnce({ error: { message: 'Cannot disable the last active admin' } })
    await expect(memberRepository.setStatus('u2', 'disabled')).rejects.toBeTruthy()
    expect(h.invoke).not.toHaveBeenCalled()
  })
})
