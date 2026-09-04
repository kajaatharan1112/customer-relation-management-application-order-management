import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/features/settings/mutations/useOrderTypeMutations', () => ({
  useSaveOrderType: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { OrderTypeFormModal } from '@/features/settings/components/OrderTypeFormModal'

const workflows = [{ id: 'w1', name: 'Printing', description: null, isActive: true, stages: [] }]

describe('OrderTypeFormModal', () => {
  it('requires a name and a workflow before saving', () => {
    render(<OrderTypeFormModal workflows={workflows} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('renders fields on the two-column form grid', () => {
    render(<OrderTypeFormModal workflows={workflows} onClose={() => {}} />)
    expect(screen.getByLabelText(/name/i).closest('[data-field]')?.parentElement).toHaveClass(
      'md:grid-cols-2',
    )
  })

  it('saves with the picked workflow and optional amount', async () => {
    render(<OrderTypeFormModal workflows={workflows} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Paper Printing')
    await userEvent.selectOptions(screen.getByLabelText(/workflow/i), 'w1')
    await userEvent.type(screen.getByLabelText(/fixed amount/i), '500')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Paper Printing', workflowTemplateId: 'w1', fixedAmount: 500 }),
    )
  })
})
