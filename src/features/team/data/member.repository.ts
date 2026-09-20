import { supabase } from '@/core/supabase/client'
import type { MemberOtherDetails, MemberVM } from '@/features/team/team.types'
import type { MemberRole } from '@/shared/constants/memberRoles'

interface Row {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: 'active' | 'invited' | 'disabled'
  created_at: string
  user_types: { key: string } | null
  member_details: {
    contact_number: string | null
    address_line: string | null
    city: string | null
    nic: string | null
    designation: string | null
    department: string | null
    date_of_birth: string | null
  } | null
}

export const memberRepository = {
  async list(role: MemberRole): Promise<MemberVM[]> {
    const { data: me } = await supabase.auth.getUser()
    const myId = me.user?.id ?? ''
    const { data, error } = await supabase
      .from('profiles')
      .select(
        // member_details has two FKs to profiles (profile_id, created_by) —
        // the embed is ambiguous without naming which one to join on.
        'id, full_name, email, phone, status, created_at, user_types!user_type_id(key), member_details!member_details_profile_id_fkey(contact_number, address_line, city, nic, designation, department, date_of_birth)',
      )
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
        contactNumber: r.member_details?.contact_number ?? null,
        addressLine: r.member_details?.address_line ?? null,
        city: r.member_details?.city ?? null,
        nic: r.member_details?.nic ?? null,
        designation: r.member_details?.designation ?? null,
        department: r.member_details?.department ?? null,
        dateOfBirth: r.member_details?.date_of_birth ?? null,
      }))
  },

  async create(input: {
    fullName: string
    email: string
    phone: string
    role: MemberRole
    otherDetails: MemberOtherDetails
  }): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        user_type: input.role,
        redirect_to: `${window.location.origin}/reset-password`,
      },
    })
    if (error) throw error
    const userId = (data as { user_id: string }).user_id
    await memberRepository.updateOtherDetails(userId, input.otherDetails)
  },

  async updateDetail(profileId: string, input: { fullName: string; phone: string }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone, updated_at: new Date().toISOString() })
      .eq('id', profileId)
    if (error) throw error
  },

  async updateOtherDetails(profileId: string, input: MemberOtherDetails): Promise<void> {
    const { error } = await supabase.from('member_details').upsert({
      profile_id: profileId,
      contact_number: input.contactNumber || null,
      address_line: input.addressLine || null,
      city: input.city || null,
      nic: input.nic || null,
      designation: input.designation || null,
      department: input.department || null,
      date_of_birth: input.dateOfBirth || null,
    })
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
