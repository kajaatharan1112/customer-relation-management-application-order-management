import type { MemberRole, MemberStatus } from '@/shared/constants/memberRoles'

export interface MemberVM {
  profileId: string
  fullName: string
  email: string
  phone: string | null
  role: MemberRole
  status: MemberStatus
  createdAt: string
  isSelf: boolean
  contactNumber: string | null
  addressLine: string | null
  city: string | null
  nic: string | null
  designation: string | null
  department: string | null
  dateOfBirth: string | null
}

export interface MemberOtherDetails {
  contactNumber: string | null
  addressLine: string | null
  city: string | null
  nic: string | null
  designation: string | null
  department: string | null
  dateOfBirth: string | null
}
