import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/shared/constants/routes'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-[var(--color-neo-text-secondary)]">
        Loading…
      </div>
    )
  }
  return session ? <Outlet /> : <Navigate to={ROUTES.login} replace />
}
