import { MEMBER_ROLE_LABEL, MEMBER_STATUS_COLOR, MEMBER_STATUS_LABEL } from '@/shared/constants/memberRoles'

it('member role labels', () => {
  expect(MEMBER_ROLE_LABEL.admin_member).toBe('Admin')
  expect(MEMBER_ROLE_LABEL.employee).toBe('Employee')
})

it('member status colours are neo tokens', () => {
  expect(MEMBER_STATUS_COLOR.active).toBe('var(--color-neo-success)')
  expect(MEMBER_STATUS_COLOR.invited).toBe('var(--color-neo-warning)')
  expect(MEMBER_STATUS_COLOR.disabled).toBe('var(--color-neo-secondary)')
})

it('member status labels', () => {
  expect(MEMBER_STATUS_LABEL.active).toBe('Active')
  expect(MEMBER_STATUS_LABEL.disabled).toBe('Disabled')
})
