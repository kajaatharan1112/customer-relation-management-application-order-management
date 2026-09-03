import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from '@/features/team/components/MemberList'
import type { MemberVM } from '@/features/team/team.types'

const m = (o: Partial<MemberVM>): MemberVM => ({
  profileId: 'p1', fullName: 'Ava Admin', email: 'ava@x.co', phone: null,
  role: 'admin_member', status: 'active', createdAt: '2026-01-01', isSelf: false, ...o,
})

it('renders a card per member with name, email and a status badge', () => {
  render(
    <MemberList
      members={[m({}), m({ profileId: 'p2', fullName: 'Bo', email: 'bo@x.co', status: 'disabled' })]}
      onEdit={() => {}}
      onSetStatus={() => {}}
      emptyCopy="none"
    />,
  )
  expect(screen.getByText('Ava Admin')).toBeInTheDocument()
  expect(screen.getByText('ava@x.co')).toBeInTheDocument()
  expect(screen.getByText('bo@x.co')).toBeInTheDocument()
  expect(screen.getByText('Active')).toBeInTheDocument()
  expect(screen.getByText('Disabled')).toBeInTheDocument()
})

it('hides Disable for self but keeps Edit', () => {
  render(<MemberList members={[m({ isSelf: true })]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="none" />)
  expect(screen.queryByRole('button', { name: /disable/i })).toBeNull()
  expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
})

it('shows Enable (not Disable) for a disabled member', () => {
  render(<MemberList members={[m({ status: 'disabled' })]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="none" />)
  expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /disable/i })).toBeNull()
})

it('wires Edit and Disable', async () => {
  const onEdit = vi.fn()
  const onSetStatus = vi.fn()
  const member = m({})
  render(<MemberList members={[member]} onEdit={onEdit} onSetStatus={onSetStatus} emptyCopy="none" />)
  await userEvent.click(screen.getByRole('button', { name: /edit/i }))
  await userEvent.click(screen.getByRole('button', { name: /disable/i }))
  expect(onEdit).toHaveBeenCalledWith(member)
  expect(onSetStatus).toHaveBeenCalledWith(member, 'disabled')
})

it('shows the empty copy when there are no members', () => {
  render(<MemberList members={[]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="No employees yet" />)
  expect(screen.getByText('No employees yet')).toBeInTheDocument()
})
