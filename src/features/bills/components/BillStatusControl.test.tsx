import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillStatusControl } from '@/features/bills/components/BillStatusControl'

describe('BillStatusControl', () => {
  it('calls onChange with the clicked status key', async () => {
    const onChange = vi.fn()
    render(<BillStatusControl currentKey="pending" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /active/i }))
    expect(onChange).toHaveBeenCalledWith('active')
  })
})
