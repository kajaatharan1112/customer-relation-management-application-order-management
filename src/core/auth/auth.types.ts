export type UserType = 'admin_member' | 'employee' | 'customer'

export interface AppProfile {
  id: string
  userType: UserType
  fullName: string
  email: string
  status: string
}
