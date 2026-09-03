import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ stats: vi.fn(), runExport: vi.fn(), purge: vi.fn() }))
vi.mock('@/features/maintenance/queries/useMaintenanceStats', () => ({ useMaintenanceStats: h.stats }))
vi.mock('@/features/maintenance/mutations/useMaintenanceActions', () => ({
  useRunExport: () => ({ mutateAsync: h.runExport, isPending: false }),
  usePurge: () => ({ mutateAsync: h.purge, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

import { AccountMaintenanceSection } from '@/features/maintenance/components/AccountMaintenanceSection'

const STATS = {
  data: {
    total: { bills: 20, billRows: 44, comments: 9, attachments: 12, storageBytes: 100000 },
    eligible: { bills: 6, billRows: 12, comments: 3, attachments: 4, storageBytes: 20000 },
    cutoff: '2025-09-03',
  },
  isLoading: false,
  isError: false,
}

describe('AccountMaintenanceSection', () => {
  it('renders the eligible counts and gates Purge behind an export', async () => {
    h.stats.mockReturnValue(STATS)
    h.runExport.mockResolvedValue({ token: 'tok-1', coversBefore: '2025-09-03', createdAt: '' })
    render(<AccountMaintenanceSection />)

    // eligible bills count is shown
    expect(screen.getByText('6')).toBeInTheDocument()

    const purgeBtn = screen.getByRole('button', { name: /purge exported/i })
    expect(purgeBtn).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /export eligible/i }))
    expect(h.runExport).toHaveBeenCalled()
    expect(purgeBtn).toBeEnabled()

    await userEvent.click(purgeBtn)
    await userEvent.type(screen.getByLabelText(/type purge/i), 'PURGE')
    await userEvent.click(screen.getByRole('button', { name: /^permanently delete$/i }))
    expect(h.purge).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok-1' }))
  })

  it('loading + error', () => {
    h.stats.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { rerender } = render(<AccountMaintenanceSection />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    h.stats.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    rerender(<AccountMaintenanceSection />)
    expect(screen.getByText(/could not load/i)).toBeInTheDocument()
  })
})
