import { describe, it, expect } from 'vitest'
import { isAdmin, isStaff, isCustomer } from '@/core/permissions/permissions'
import type { AppProfile } from '@/core/auth/auth.types'

const mk = (t: AppProfile['userType']): AppProfile => ({
  id: '1',
  userType: t,
  fullName: '',
  email: '',
  status: 'active',
  themeColor: 'indigo',
})

describe('permissions', () => {
  it('isAdmin only for admin_member', () => {
    expect(isAdmin(mk('admin_member'))).toBe(true)
    expect(isAdmin(mk('employee'))).toBe(false)
    expect(isAdmin(mk('customer'))).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
  it('isStaff for admin_member and employee', () => {
    expect(isStaff(mk('admin_member'))).toBe(true)
    expect(isStaff(mk('employee'))).toBe(true)
    expect(isStaff(mk('customer'))).toBe(false)
    expect(isStaff(null)).toBe(false)
  })
  it('isCustomer only for customer', () => {
    expect(isCustomer(mk('customer'))).toBe(true)
    expect(isCustomer(mk('admin_member'))).toBe(false)
    expect(isCustomer(null)).toBe(false)
  })
})
