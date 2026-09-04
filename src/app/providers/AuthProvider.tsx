import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase/client'
import { accentByKey } from '@/core/theme/accents'
import type { AppProfile, UserType } from '@/core/auth/auth.types'

interface AuthValue {
  session: Session | null
  profile: AppProfile | null
  loading: boolean
  /** Re-fetch the current user's profile row into context (after a self-edit). */
  refreshProfile: () => Promise<void>
}

const AuthCtx = createContext<AuthValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

async function loadProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, status, theme_color, user_types(key)')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  const nested = data as typeof data & { user_types: { key: UserType } | null }
  const key = nested.user_types?.key
  if (!key) return null
  return {
    id: data.id,
    userType: key,
    fullName: data.full_name,
    email: data.email,
    status: data.status,
    themeColor: accentByKey(data.theme_color).key,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const sessionRef = useRef<Session | null>(null)

  const hydrate = async (next: Session | null) => {
    sessionRef.current = next
    setSession(next)
    setProfile(next ? await loadProfile(next.user.id) : null)
    setLoading(false)
  }

  const refreshProfile = async () => {
    const current = sessionRef.current
    if (current) setProfile(await loadProfile(current.user.id))
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      await hydrate(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await hydrate(nextSession)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthCtx.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
