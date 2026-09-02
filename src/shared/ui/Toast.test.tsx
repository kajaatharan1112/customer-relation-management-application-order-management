import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/shared/ui/Toast'

function Trigger() {
  const { show } = useToast()
  return <button onClick={() => show({ type: 'success', title: 'Saved' })}>go</button>
}

describe('Toast', () => {
  it('shows a toast on demand', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'go' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })
})
