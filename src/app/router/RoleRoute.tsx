import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { isStaff, isCustomer, isAdmin } from '@/core/permissions/permissions'
import { ROUTES } from '@/shared/constants/routes'

export function RoleRoute({ allow }: { allow: 'staff' | 'customer' | 'admin' }) {
  const { profile, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-[var(--color-neo-text-secondary)]">
        Loading…
      </div>
    )
  }
  if (allow === 'staff' && !isStaff(profile)) return <Navigate to={ROUTES.portalHome} replace />
  if (allow === 'customer' && !isCustomer(profile)) return <Navigate to={ROUTES.dashboard} replace />
  if (allow === 'admin' && !isAdmin(profile)) return <Navigate to={ROUTES.dashboard} replace />
  return <Outlet />
}
