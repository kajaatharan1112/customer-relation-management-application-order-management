import { supabase } from '@/core/supabase/client'
import type { CustomerVM } from '@/features/customers/customers.types'

interface CustomerRow {
  profile_id: string
  company_name: string | null
  address_line: string | null
  city: string | null
  notes: string | null
  profiles: {
    full_name: string
    email: string
    phone: string | null
    bills: { count: number }[]
  } | null
}

interface DetailInput {
  fullName: string
  phone: string
  companyName: string | null
  addressLine: string | null
  city: string | null
  notes: string | null
}

export const customerRepository = {
  async list(): Promise<CustomerVM[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(
        'profile_id, company_name, address_line, city, notes, profiles!profile_id(full_name, email, phone, bills!customer_id(count))',
      )
      .is('deleted_at', null)
      .order('company_name', { nullsFirst: false })
    if (error) throw error
    return (data as unknown as CustomerRow[]).map((r) => ({
      profileId: r.profile_id,
      fullName: r.profiles?.full_name ?? '',
      email: r.profiles?.email ?? '',
      phone: r.profiles?.phone ?? null,
      companyName: r.company_name,
      addressLine: r.address_line,
      city: r.city,
      notes: r.notes,
      billCount: r.profiles?.bills?.[0]?.count ?? 0,
    }))
  },

  async createWithLogin(input: {
    fullName: string
    email: string
    phone: string
    companyName: string | null
    addressLine: string | null
    city: string | null
    notes: string | null
  }): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        user_type: 'customer',
        redirect_to: `${window.location.origin}/reset-password`,
      },
    })
    if (error) throw error
    const userId = (data as { user_id: string }).user_id
    await customerRepository.updateDetail(userId, {
      fullName: input.fullName,
      phone: input.phone,
      companyName: input.companyName,
      addressLine: input.addressLine,
      city: input.city,
      notes: input.notes,
    })
  },

  async updateDetail(profileId: string, input: DetailInput): Promise<void> {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone })
      .eq('id', profileId)
    if (pErr) throw pErr
    const { error: cErr } = await supabase
      .from('customers')
      .update({
        company_name: input.companyName,
        address_line: input.addressLine,
        city: input.city,
        notes: input.notes,
      })
      .eq('profile_id', profileId)
    if (cErr) throw cErr
  },

  async softDelete(profileId: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_customer', { p_profile_id: profileId })
    if (error) throw error
  },
}
