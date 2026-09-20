export interface CustomerVM {
  profileId: string
  fullName: string
  email: string
  phone: string | null
  companyName: string | null
  addressLine: string | null
  city: string | null
  notes: string | null
  billCount: number
  status: 'active' | 'invited' | 'disabled'
}
