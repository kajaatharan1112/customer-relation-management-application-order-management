import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/features/team/mutations/useMemberMutations', () => ({
  useCreateMember: () => ({ mutateAsync: h.create, isPending: false }),
  useUpdateMember: () => ({ mutateAsync: h.update, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { MemberFormModal } from '@/features/team/components/MemberFormModal'

const member = {
  profileId: 'p1', fullName: 'Ava', email: 'ava@x.co', phone: '77',
  role: 'admin_member' as const, status: 'active' as const, createdAt: '', isSelf: false,
}

describe('MemberFormModal', () => {
  it('add mode: disabled until name + valid email + password(>=8); creates with the role', async () => {
    render(<MemberFormModal role="employee" onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Sam')
    await userEvent.type(screen.getByLabelText(/^email/i), 'sam@x.co')
    await userEvent.type(screen.getByLabelText(/temporary password/i), 'secret123')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(h.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Sam', email: 'sam@x.co', role: 'employee', tempPassword: 'secret123' }),
    )
  })

  it('renders fields on the two-column form grid', () => {
    render(<MemberFormModal role="employee" onClose={() => {}} />)
    expect(screen.getByLabelText(/full name/i).closest('[data-field]')?.parentElement).toHaveClass(
      'md:grid-cols-2',
    )
  })

  it('edit mode: no password field, email read-only, calls update', async () => {
    render(<MemberFormModal role="admin_member" member={member} onClose={() => {}} />)
    expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('readonly')
    await userEvent.clear(screen.getByLabelText(/full name/i))
    await userEvent.type(screen.getByLabelText(/full name/i), 'Ava A')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(h.update).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'p1', fullName: 'Ava A', phone: '77' }),
    )
  })
})
