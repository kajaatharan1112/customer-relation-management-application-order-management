import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const templates = [{ id: 't1', name: 'Printing', description: null, isActive: true, stages: [] }]
const orderTypes = [
  { id: 'ot1', name: 'Paper Printing', workflowTemplateId: 't1', workflowName: 'Printing', fixedAmount: null, isActive: true },
]

vi.mock('@/features/settings/queries/useWorkflowTemplates', () => ({
  useWorkflowTemplates: () => ({ data: templates, isLoading: false, isError: false }),
}))
vi.mock('@/features/settings/queries/useOrderTypes', () => ({
  useOrderTypes: () => ({ data: orderTypes, isLoading: false, isError: false }),
}))
vi.mock('@/features/settings/mutations/useWorkflowMutations', () => ({
  useDeleteWorkflow: () => ({ mutateAsync: vi.fn() }),
  useSaveWorkflow: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/settings/mutations/useOrderTypeMutations', () => ({
  useDeleteOrderType: () => ({ mutateAsync: vi.fn() }),
  useSaveOrderType: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

function mockRole(isAdmin: boolean) {
  vi.doMock('@/core/auth/auth.hooks', () => ({
    useRole: () => ({ isAdmin, isStaff: true, isCustomer: false, profile: null, loading: false }),
  }))
}

describe('SettingsPage', () => {
  it('hides write controls for a non-admin staff member', async () => {
    vi.resetModules()
    mockRole(false)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Printing')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new workflow/i })).not.toBeInTheDocument()
  })

  it('shows write controls for an admin', async () => {
    vi.resetModules()
    mockRole(true)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /new workflow/i })).toBeInTheDocument()
  })
})
