import type { AppProfile } from '@/core/auth/auth.types'

export const isAdmin = (p: AppProfile | null): boolean => p?.userType === 'admin_member'

export const isStaff = (p: AppProfile | null): boolean =>
  p?.userType === 'admin_member' || p?.userType === 'employee'

export const isCustomer = (p: AppProfile | null): boolean => p?.userType === 'customer'
