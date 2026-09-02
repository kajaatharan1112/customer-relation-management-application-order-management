import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase/client'
import type { AppProfile, UserType } from '@/core/auth/auth.types'

interface AuthValue {
  session: Session | null
  profile: AppProfile | null
  loading: boolean
}

const AuthCtx = createContext<AuthValue>({ session: null, profile: null, loading: true })

async function loadProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, status, user_types(key)')
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
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      setProfile(data.session ? await loadProfile(data.session.user.id) : null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setProfile(nextSession ? await loadProfile(nextSession.user.id) : null)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <AuthCtx.Provider value={{ session, profile, loading }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
