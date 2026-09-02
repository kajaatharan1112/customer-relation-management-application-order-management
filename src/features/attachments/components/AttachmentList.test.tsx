import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'

const atts = [
  {
    id: 'a1',
    fileName: 'proof.pdf',
    sizeBytes: 2048,
    storagePath: 'bill/b1/x.pdf',
    uploadedByName: 'Ava',
    createdAt: new Date().toISOString(),
  },
]

describe('AttachmentList', () => {
  it('read-only: download only, no upload/remove', () => {
    render(
      <AttachmentList
        attachments={atts}
        canManage={false}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
        onDownload={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/upload a file/i)).not.toBeInTheDocument()
  })

  it('manage: shows upload + remove, download calls onDownload', async () => {
    const onDownload = vi.fn()
    render(
      <AttachmentList
        attachments={atts}
        canManage
        onUpload={vi.fn()}
        onRemove={vi.fn()}
        onDownload={onDownload}
      />,
    )
    expect(screen.getByLabelText(/upload a file/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(onDownload).toHaveBeenCalledWith(atts[0])
  })
})
