import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue('b1') }))
vi.mock('@/features/bills/mutations/useBillMutations', () => ({
  useSaveBill: () => ({ mutateAsync: h.save, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { BillFormModal } from '@/features/bills/components/BillFormModal'

const customers = [
  {
    profileId: 'p1',
    fullName: 'Cara',
    email: 'c@x.co',
    phone: null,
    companyName: null,
    addressLine: null,
    city: null,
    notes: null,
    billCount: 0,
    status: 'active' as const,
  },
]
const orderTypes = [{ id: 'ot1', name: 'Printing', fixedAmount: 250 }]

describe('BillFormModal', () => {
  it('save gated on a customer and one detailed row', async () => {
    render(<BillFormModal customers={customers} orderTypes={orderTypes} onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText(/customer/i), 'p1')
    await userEvent.click(screen.getByRole('button', { name: /add row/i }))
    await userEvent.type(screen.getByLabelText(/row 1 detail/i), 'Poster')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(h.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bill: expect.objectContaining({ customerId: 'p1' }),
        rows: [expect.objectContaining({ detail: 'Poster' })],
      }),
    )
  })
})
