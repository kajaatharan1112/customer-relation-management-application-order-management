import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn(),
  eq: vi.fn().mockResolvedValue({ error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  invoke: vi.fn().mockResolvedValue({ data: { user_id: 'u-new' }, error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }),
  fromCalls: [] as string[],
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      h.fromCalls.push(table)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: h.order,
        update: vi.fn(() => ({ eq: h.eq })),
        upsert: h.upsert,
      }
    }),
    functions: { invoke: h.invoke },
    rpc: h.rpc,
    auth: { getUser: h.getUser },
  },
}))

import { memberRepository } from '@/features/team/data/member.repository'

const otherDetails = {
  contactNumber: null, addressLine: null, city: null, nic: null,
  designation: null, department: null, dateOfBirth: null,
}

describe('memberRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.fromCalls.length = 0
  })

  it('list maps profile rows to MemberVM and flags isSelf', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'me' } } })
    h.order.mockResolvedValue({
      data: [
        { id: 'me', full_name: 'Ava', email: 'ava@x.co', phone: null, status: 'active', created_at: '2026-01-01', user_types: { key: 'admin_member' }, member_details: null },
        { id: 'u2', full_name: 'Bo', email: 'bo@x.co', phone: '77', status: 'disabled', created_at: '2026-02-02', user_types: { key: 'admin_member' }, member_details: { contact_number: '077', address_line: null, city: null, nic: null, designation: null, department: null, date_of_birth: null } },
      ],
      error: null,
    })
    const out = await memberRepository.list('admin_member')
    expect(out[0]).toMatchObject({ profileId: 'me', role: 'admin_member', status: 'active', isSelf: true })
    expect(out[1]).toMatchObject({ profileId: 'u2', isSelf: false, phone: '77', contactNumber: '077' })
  })

  it('create posts the admin-create-user body then upserts the other-details row', async () => {
    await memberRepository.create({ fullName: 'Sam', email: 's@x.co', phone: '1', role: 'employee', otherDetails: { ...otherDetails, contactNumber: '0771234567' } })
    expect(h.invoke).toHaveBeenCalledWith('admin-create-user', {
      body: {
        email: 's@x.co',
        full_name: 'Sam',
        phone: '1',
        user_type: 'employee',
        redirect_to: `${window.location.origin}/reset-password`,
      },
    })
    expect(h.fromCalls).toContain('member_details')
    expect(h.upsert).toHaveBeenCalledWith(expect.objectContaining({ profile_id: 'u-new', contact_number: '0771234567' }))
  })

  it('updateOtherDetails upserts nulls for blank fields', async () => {
    await memberRepository.updateOtherDetails('p1', otherDetails)
    expect(h.upsert).toHaveBeenCalledWith({
      profile_id: 'p1',
      contact_number: null,
      address_line: null,
      city: null,
      nic: null,
      designation: null,
      department: null,
      date_of_birth: null,
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
