import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/shared/ui/Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        body
      </Modal>,
    )
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })
  it('renders content when open and closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Hi">
        body
      </Modal>,
    )
    expect(screen.getByText('body')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('defaults to the small width', () => {
    render(
      <Modal open onClose={() => {}} title="T">
        body
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveClass('max-w-lg')
  })

  it('applies the wide width for size="lg"', () => {
    render(
      <Modal open onClose={() => {}} title="T" size="lg">
        body
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveClass('max-w-[920px]')
  })

  it('renders the footer in a pinned region and keeps the body scrollable', () => {
    render(
      <Modal open onClose={() => {}} title="T" footer={<button>Save</button>}>
        <p>content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('[data-modal-body]')).toHaveClass('overflow-y-auto')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
