import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  verify: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/features/customers/mutations/useCustomerMutations', () => ({
  useCreateCustomer: () => ({ mutateAsync: h.create, isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: h.update, isPending: false }),
}))
vi.mock('@/shared/mutations/useVerifyInvite', () => ({
  useVerifyInvite: () => ({ mutateAsync: h.verify, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'

describe('CustomerFormModal', () => {
  it('add mode: Send OTP is gated on name + email + an 8-char password, then Verify appears', async () => {
    render(<CustomerFormModal onClose={() => {}} />)
    const sendOtp = screen.getByRole('button', { name: /send otp/i })
    expect(sendOtp).toBeDisabled()
    expect(screen.queryByRole('button', { name: /verify & activate/i })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Pat')
    await userEvent.type(screen.getByLabelText(/^email/i), 'pat@x.co')
    await userEvent.type(screen.getByLabelText(/set their password/i), 'password123')
    expect(sendOtp).toBeEnabled()

    await userEvent.click(sendOtp)
    expect(h.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Pat', email: 'pat@x.co' }),
    )

    const verifyBtn = await screen.findByRole('button', { name: /verify & activate/i })
    expect(verifyBtn).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '654321')
    expect(verifyBtn).toBeEnabled()

    await userEvent.click(verifyBtn)
    expect(h.verify).toHaveBeenCalledWith({ email: 'pat@x.co', token: '654321', password: 'password123' })
  })

  it('edit mode: no password/OTP fields, email read-only, Save calls update', async () => {
    render(
      <CustomerFormModal
        customer={{
          profileId: 'p1',
          fullName: 'Cara',
          email: 'cara@x.co',
          phone: null,
          companyName: null,
          addressLine: null,
          city: null,
          notes: null,
          billCount: 0,
        }}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByLabelText(/set their password/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('readonly')

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p1' }))
  })

  it('lays out wide: address and notes span both columns', () => {
    render(<CustomerFormModal onClose={() => {}} />)
    expect(screen.getByLabelText(/address/i).closest('[data-field]')).toHaveClass('md:col-span-2')
    expect(screen.getByLabelText(/notes/i).closest('[data-field]')).toHaveClass('md:col-span-2')
    expect(screen.getByLabelText(/full name/i).closest('[data-field]')).not.toHaveClass(
      'md:col-span-2',
    )
  })
})
