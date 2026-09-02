import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  order: vi.fn().mockResolvedValue({
    data: [
      {
        profile_id: 'p1',
        company_name: 'Acme',
        address_line: '1 St',
        city: 'Colombo',
        notes: null,
        profiles: { full_name: 'Cara', email: 'cara@x.co', phone: '123', bills: [{ count: 2 }] },
      },
    ],
    error: null,
  }),
  invoke: vi.fn().mockResolvedValue({ data: { user_id: 'newid' }, error: null }),
  eq: vi.fn().mockResolvedValue({ error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: h.order,
      update: vi.fn(() => ({ eq: h.eq })),
    })),
    functions: { invoke: h.invoke },
    rpc: h.rpc,
  },
}))

import { customerRepository } from '@/features/customers/data/customer.repository'

describe('customerRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list maps rows and bill count', async () => {
    const r = await customerRepository.list()
    expect(r).toEqual([
      {
        profileId: 'p1',
        fullName: 'Cara',
        email: 'cara@x.co',
        phone: '123',
        companyName: 'Acme',
        addressLine: '1 St',
        city: 'Colombo',
        notes: null,
        billCount: 2,
      },
    ])
  })

  it('createWithLogin invokes the edge function then updates detail', async () => {
    await customerRepository.createWithLogin({
      fullName: 'New Person',
      email: 'np@x.co',
      phone: '9',
      tempPassword: 'secret123',
      companyName: 'Co',
      addressLine: null,
      city: null,
      notes: null,
    })
    expect(h.invoke).toHaveBeenCalledWith('admin-create-user', {
      body: {
        email: 'np@x.co',
        full_name: 'New Person',
        phone: '9',
        user_type: 'customer',
        temp_password: 'secret123',
      },
    })
  })

  it('softDelete calls the rpc', async () => {
    await customerRepository.softDelete('p1')
    expect(h.rpc).toHaveBeenCalledWith('soft_delete_customer', { p_profile_id: 'p1' })
  })
})
