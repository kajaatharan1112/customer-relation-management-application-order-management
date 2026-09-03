import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const team = vi.hoisted(() => ({ members: vi.fn(), setStatus: vi.fn() }))
vi.mock('@/features/team/queries/useMembers', () => ({ useMembers: team.members }))
vi.mock('@/features/team/mutations/useMemberMutations', () => ({
  useSetMemberStatus: () => ({ mutateAsync: team.setStatus }),
  useCreateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/maintenance/queries/useMaintenanceStats', () => ({
  useMaintenanceStats: () => ({
    data: {
      total: { bills: 0, billRows: 0, comments: 0, attachments: 0, storageBytes: 0 },
      eligible: { bills: 0, billRows: 0, comments: 0, attachments: 0, storageBytes: 0 },
      cutoff: '2025-09-03',
    },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('@/features/maintenance/mutations/useMaintenanceActions', () => ({
  useRunExport: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePurge: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

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
      <MemoryRouter initialEntries={['/?tab=workflows']}>
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
      <MemoryRouter initialEntries={['/?tab=workflows']}>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /new workflow/i })).toBeInTheDocument()
  })

  it('renders the section menu and navigates in and back', async () => {
    vi.resetModules()
    mockRole(true)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /workflows/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /order types/i })).toBeInTheDocument()
    expect(screen.queryByText('Printing')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /order types/i }))

    expect(screen.getByText('Paper Printing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new order type/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^settings$/i }))

    expect(screen.getByRole('button', { name: /workflows/i })).toBeInTheDocument()
    expect(screen.queryByText('Paper Printing')).not.toBeInTheDocument()
  })

  it('menu shows Admins + Employees; opening Employees lists them with a New employee button', async () => {
    team.members.mockReturnValue({
      data: [
        { profileId: 'e1', fullName: 'Ed Employee', email: 'ed@x.co', phone: null, role: 'employee', status: 'active', createdAt: '', isSelf: false },
      ],
      isLoading: false,
      isError: false,
    })
    vi.resetModules()
    mockRole(true)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /admins/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /employees/i }))
    expect(screen.getByText('Ed Employee')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new employee/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('opens the Account maintenance section from the menu', async () => {
    team.members.mockReturnValue({ data: [], isLoading: false, isError: false })
    vi.resetModules()
    mockRole(true)
    const { default: SettingsPage } = await import('@/features/settings/SettingsPage')
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /account maintenance/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Account maintenance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export eligible/i })).toBeInTheDocument()
  })
})
