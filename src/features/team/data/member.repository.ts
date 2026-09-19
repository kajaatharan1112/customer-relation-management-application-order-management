import { supabase } from '@/core/supabase/client'
import type { MemberVM } from '@/features/team/team.types'
import type { MemberRole } from '@/shared/constants/memberRoles'

interface Row {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: 'active' | 'invited' | 'disabled'
  created_at: string
  user_types: { key: string } | null
}

export const memberRepository = {
  async list(role: MemberRole): Promise<MemberVM[]> {
    const { data: me } = await supabase.auth.getUser()
    const myId = me.user?.id ?? ''
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, status, created_at, user_types!user_type_id(key)')
      .eq('user_types.key', role)
      .is('deleted_at', null)
      .order('full_name')
    if (error) throw error
    return (data as unknown as Row[])
      .filter((r) => r.user_types?.key === role)
      .map((r) => ({
        profileId: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        role,
        status: r.status,
        createdAt: r.created_at,
        isSelf: r.id === myId,
      }))
  },

  async create(input: {
    fullName: string
    email: string
    phone: string
    role: MemberRole
  }): Promise<void> {
    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        user_type: input.role,
        redirect_to: `${window.location.origin}/reset-password`,
      },
    })
    if (error) throw error
  },

  async updateDetail(profileId: string, input: { fullName: string; phone: string }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone, updated_at: new Date().toISOString() })
      .eq('id', profileId)
    if (error) throw error
  },

  async setStatus(profileId: string, status: 'active' | 'disabled'): Promise<void> {
    const { error } = await supabase.rpc('set_member_status', {
      p_profile_id: profileId,
      p_status: status,
    })
    if (error) throw error
    const { error: bErr } = await supabase.functions.invoke('admin-set-user-ban', {
      body: { target_user_id: profileId, banned: status === 'disabled' },
    })
    if (bErr) throw bErr
  },
}
