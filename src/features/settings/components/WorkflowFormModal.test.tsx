import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue('t1') }))
vi.mock('@/features/settings/mutations/useWorkflowMutations', () => ({
  useSaveWorkflow: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { WorkflowFormModal } from '@/features/settings/components/WorkflowFormModal'

const template = {
  id: 't1', name: 'Standard Print', description: null, isActive: true,
  stages: [{ id: 's1', name: 'Prep', sortOrder: 0, color: '#111', isFinal: true }],
}

describe('WorkflowFormModal', () => {
  it('disables save until there is a name, a stage, and one final stage', () => {
    render(<WorkflowFormModal onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('lays name and description on the two-column form grid', () => {
    render(<WorkflowFormModal onClose={() => {}} />)
    expect(
      screen.getByLabelText(/workflow name/i).closest('[data-field]')?.parentElement,
    ).toHaveClass('md:grid-cols-2')
  })

  it('saves a valid workflow', async () => {
    render(<WorkflowFormModal onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/workflow name/i), 'Printing')
    await userEvent.click(screen.getByRole('button', { name: /add stage/i }))
    await userEvent.type(screen.getByLabelText(/stage 1 name/i), 'Prep')
    await userEvent.click(screen.getByLabelText(/final stage/i))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({ name: 'Printing' }),
        stages: [expect.objectContaining({ name: 'Prep', isFinal: true })],
      }),
    )
  })

  it('edit mode: hides Save until something changes', async () => {
    render(<WorkflowFormModal template={template} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/workflow name/i), ' v2')
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled()
  })
})
