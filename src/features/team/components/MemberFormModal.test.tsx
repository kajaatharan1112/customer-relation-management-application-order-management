import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  updateOther: vi.fn().mockResolvedValue(undefined),
  verify: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/features/team/mutations/useMemberMutations', () => ({
  useCreateMember: () => ({ mutateAsync: h.create, isPending: false }),
  useUpdateMember: () => ({ mutateAsync: h.update, isPending: false }),
  useUpdateMemberOtherDetails: () => ({ mutateAsync: h.updateOther, isPending: false }),
}))
vi.mock('@/shared/mutations/useVerifyInvite', () => ({
  useVerifyInvite: () => ({ mutateAsync: h.verify, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { MemberFormModal } from '@/features/team/components/MemberFormModal'

const member = {
  profileId: 'p1', fullName: 'Ava', email: 'ava@x.co', phone: '77',
  role: 'admin_member' as const, status: 'active' as const, createdAt: '', isSelf: false,
  contactNumber: null, addressLine: null, city: null, nic: null,
  designation: null, department: null, dateOfBirth: null,
}

describe('MemberFormModal', () => {
  it('add mode: Send OTP is gated on name + email + an 8-char password, then Verify appears', async () => {
    render(<MemberFormModal role="employee" onClose={() => {}} />)
    const sendOtp = screen.getByRole('button', { name: /send otp/i })
    expect(sendOtp).toBeDisabled()
    expect(screen.queryByRole('button', { name: /verify & activate/i })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Sam')
    await userEvent.type(screen.getByLabelText(/^email/i), 'sam@x.co')
    await userEvent.type(screen.getByLabelText(/set their password/i), 'password123')
    expect(sendOtp).toBeEnabled()

    await userEvent.click(sendOtp)
    expect(h.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Sam', email: 'sam@x.co', role: 'employee' }),
    )

    const verifyBtn = await screen.findByRole('button', { name: /verify & activate/i })
    expect(verifyBtn).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456')
    expect(verifyBtn).toBeEnabled()

    await userEvent.click(verifyBtn)
    expect(h.verify).toHaveBeenCalledWith({ email: 'sam@x.co', token: '123456', password: 'password123' })
  })

  it('renders fields on the two-column form grid', () => {
    render(<MemberFormModal role="employee" onClose={() => {}} />)
    expect(screen.getByLabelText(/full name/i).closest('[data-field]')?.parentElement).toHaveClass(
      'md:grid-cols-2',
    )
  })

  it('add mode: includes the optional Other details fields', () => {
    render(<MemberFormModal role="employee" onClose={() => {}} />)
    expect(screen.getByLabelText(/contact number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nic/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/designation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
  })

  it('edit mode: no password/OTP fields, email read-only, Save hidden until dirty, saves personal + other details', async () => {
    render(<MemberFormModal role="admin_member" member={member} onClose={() => {}} />)
    expect(screen.queryByLabelText(/set their password/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText(/full name/i))
    await userEvent.type(screen.getByLabelText(/full name/i), 'Ava A')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(h.update).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'p1', fullName: 'Ava A', phone: '77' }),
    )
    expect(h.updateOther).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'p1' }),
    )
  })
})
