import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/features/customers/mutations/useCustomerMutations', () => ({
  useCreateCustomer: () => ({ mutateAsync: h.create, isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: h.update, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'

describe('CustomerFormModal', () => {
  it('add mode: disabled until name, valid email, and password', async () => {
    render(<CustomerFormModal onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Pat')
    await userEvent.type(screen.getByLabelText(/^email/i), 'pat@x.co')
    await userEvent.type(screen.getByLabelText(/temporary password/i), 'secret123')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(h.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Pat', email: 'pat@x.co', tempPassword: 'secret123' }),
    )
  })

  it('edit mode: no password field, email read-only', () => {
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
    expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('readonly')
  })
})
