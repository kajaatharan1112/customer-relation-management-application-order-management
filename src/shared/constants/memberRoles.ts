export type MemberRole = 'admin_member' | 'employee'
export type MemberStatus = 'active' | 'invited' | 'disabled'

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  admin_member: 'Admin',
  employee: 'Employee',
}

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  disabled: 'Disabled',
}

export const MEMBER_STATUS_COLOR: Record<MemberStatus, string> = {
  active: 'var(--color-neo-success)',
  invited: 'var(--color-neo-warning)',
  disabled: 'var(--color-neo-secondary)',
}
