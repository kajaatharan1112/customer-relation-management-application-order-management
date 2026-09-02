import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { isStaff } from '@/core/permissions/permissions'
import { ROUTES } from '@/shared/constants/routes'

export default function OAuthCallbackPage() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate(ROUTES.login, { replace: true })
      return
    }
    navigate(isStaff(profile) ? ROUTES.dashboard : ROUTES.portalHome, { replace: true })
  }, [loading, session, profile, navigate])

  return (
    <div className="grid min-h-dvh place-items-center text-[var(--color-neo-text-secondary)]">
      Signing you in…
    </div>
  )
}
