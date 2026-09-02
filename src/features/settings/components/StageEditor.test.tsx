import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StageEditor } from '@/features/settings/components/StageEditor'

const two = [
  { name: 'Prep', color: '#111', isFinal: false },
  { name: 'Done', color: '#222', isFinal: true },
]

describe('StageEditor', () => {
  it('adds a stage', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add stage/i }))
    expect(onChange).toHaveBeenCalledWith([...two, expect.objectContaining({ name: '', isFinal: false })])
  })

  it('moves a stage up', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: /move up/i })[1])
    expect(onChange).toHaveBeenCalledWith([two[1], two[0]])
  })

  it('marking a stage final clears the others', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('radio', { name: /final/i })[0])
    expect(onChange).toHaveBeenCalledWith([
      { ...two[0], isFinal: true },
      { ...two[1], isFinal: false },
    ])
  })

  it('deletes a stage', async () => {
    const onChange = vi.fn()
    render(<StageEditor stages={two} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: /delete stage/i })[0])
    expect(onChange).toHaveBeenCalledWith([two[1]])
  })
})
