import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { applyAccent } from '@/core/theme/applyAccent'

/**
 * Applies the signed-in user's accent to <html> whenever it resolves or changes.
 * Before sign-in, whatever the pre-paint script in index.html set stays in place.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const accent = profile?.themeColor

  useEffect(() => {
    if (accent) applyAccent(accent)
  }, [accent])

  return <>{children}</>
}
