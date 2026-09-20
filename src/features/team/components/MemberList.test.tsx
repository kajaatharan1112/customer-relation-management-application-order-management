import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from '@/features/team/components/MemberList'
import type { MemberVM } from '@/features/team/team.types'

const m = (o: Partial<MemberVM>): MemberVM => ({
  profileId: 'p1', fullName: 'Ava Admin', email: 'ava@x.co', phone: null,
  role: 'admin_member', status: 'active', createdAt: '2026-01-01', isSelf: false,
  contactNumber: null, addressLine: null, city: null, nic: null,
  designation: null, department: null, dateOfBirth: null,
  ...o,
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

it('clicking the card calls onEdit', async () => {
  const onEdit = vi.fn()
  const member = m({})
  render(<MemberList members={[member]} onEdit={onEdit} onSetStatus={() => {}} emptyCopy="none" />)
  await userEvent.click(screen.getByText('Ava Admin'))
  expect(onEdit).toHaveBeenCalledWith(member)
})

it('hides the actions menu for self (no Disable option)', () => {
  render(<MemberList members={[m({ isSelf: true })]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="none" />)
  expect(screen.queryByRole('button', { name: /actions for/i })).not.toBeInTheDocument()
})

it('menu offers Enable (not Disable) for a disabled member', async () => {
  render(<MemberList members={[m({ status: 'disabled' })]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="none" />)
  await userEvent.click(screen.getByRole('button', { name: /actions for/i }))
  expect(screen.getByRole('menuitem', { name: /enable/i })).toBeInTheDocument()
  expect(screen.queryByRole('menuitem', { name: /disable/i })).not.toBeInTheDocument()
})

it('wires the Disable menu item without triggering onEdit', async () => {
  const onEdit = vi.fn()
  const onSetStatus = vi.fn()
  const member = m({})
  render(<MemberList members={[member]} onEdit={onEdit} onSetStatus={onSetStatus} emptyCopy="none" />)
  await userEvent.click(screen.getByRole('button', { name: /actions for/i }))
  await userEvent.click(screen.getByRole('menuitem', { name: /disable/i }))
  expect(onSetStatus).toHaveBeenCalledWith(member, 'disabled')
  expect(onEdit).not.toHaveBeenCalled()
})

it('shows the empty copy when there are no members', () => {
  render(<MemberList members={[]} onEdit={() => {}} onSetStatus={() => {}} emptyCopy="No employees yet" />)
  expect(screen.getByText('No employees yet')).toBeInTheDocument()
})
