import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StageStepper } from '@/features/tracking/components/StageStepper'

const stages = [
  { id: 's1', name: 'Prep', sortOrder: 1, color: '#111', isFinal: false },
  { id: 's2', name: 'Print', sortOrder: 2, color: '#222', isFinal: false },
  { id: 's3', name: 'Done', sortOrder: 3, color: '#333', isFinal: true },
]

describe('StageStepper', () => {
  it('renders stages and marks the current one', () => {
    render(<StageStepper stages={stages} currentStageId="s2" />)
    expect(screen.getByText('Prep')).toBeInTheDocument()
    expect(screen.getByText('Print').closest('[data-current]')).not.toBeNull()
  })

  it('interactive: clicking a stage calls onPick', async () => {
    const onPick = vi.fn()
    render(<StageStepper stages={stages} currentStageId="s1" onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /print/i }))
    expect(onPick).toHaveBeenCalledWith('s2')
  })

  it('read-only: no buttons when onPick omitted', () => {
    render(<StageStepper stages={stages} currentStageId="s1" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
