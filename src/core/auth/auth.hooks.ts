import { useAuth } from '@/app/providers/AuthProvider'
import { isAdmin, isStaff, isCustomer } from '@/core/permissions/permissions'

export function useRole() {
  const { profile, loading } = useAuth()
  return {
    profile,
    loading,
    isAdmin: isAdmin(profile),
    isStaff: isStaff(profile),
    isCustomer: isCustomer(profile),
  }
}
