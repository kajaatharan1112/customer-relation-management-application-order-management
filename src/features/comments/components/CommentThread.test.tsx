import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentThread } from '@/features/comments/components/CommentThread'

const comments = [
  { id: 'c1', authorName: 'Ava', authorIsStaff: true, body: 'hi', createdAt: new Date().toISOString() },
]

describe('CommentThread', () => {
  it('lists comments and posts a new one', async () => {
    const onPost = vi.fn().mockResolvedValue(undefined)
    render(<CommentThread comments={comments} onPost={onPost} posting={false} />)
    expect(screen.getByText('hi')).toBeInTheDocument()
    const box = screen.getByPlaceholderText(/write a message/i)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    await userEvent.type(box, 'my reply')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onPost).toHaveBeenCalledWith('my reply')
  })
})
