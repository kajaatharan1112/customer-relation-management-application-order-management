import { supabase } from '@/core/supabase/client'
import type { AccentKey } from '@/core/theme/accents'

export interface OwnProfileVM {
  fullName: string
  phone: string
  email: string
}

async function requireUid(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error('Not signed in')
  return id
}

export const profileRepository = {
  async getOwn(): Promise<OwnProfileVM> {
    const uid = await requireUid()
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', uid)
      .single()
    if (error || !data) throw error ?? new Error('Profile not found')
    return { fullName: data.full_name, phone: data.phone ?? '', email: data.email }
  },

  async updateOwn(input: { fullName: string; phone: string | null }): Promise<void> {
    const uid = await requireUid()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone })
      .eq('id', uid)
    if (error) throw error
  },

  async setAccent(key: AccentKey): Promise<void> {
    const uid = await requireUid()
    const { error } = await supabase.from('profiles').update({ theme_color: key }).eq('id', uid)
    if (error) throw error
  },

  async changePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },
}
