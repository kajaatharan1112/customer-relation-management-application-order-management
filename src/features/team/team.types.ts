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
}
