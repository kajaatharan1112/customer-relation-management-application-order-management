import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { relativeTime } from '@/shared/utils/relativeTime'
import type { CommentVM } from '@/features/comments/comments.types'

export function CommentThread({
  comments,
  onPost,
  posting,
}: {
  comments: CommentVM[]
  onPost: (body: string) => Promise<void> | void
  posting: boolean
}) {
  const [draft, setDraft] = useState('')

  const submit = async () => {
    const body = draft.trim()
    if (!body) return
    await onPost(body)
    setDraft('')
  }

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">No messages yet.</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-3 shadow-[var(--shadow-neo-pressed)]"
            >
              <p className="text-xs font-semibold text-[var(--color-neo-text-primary)]">
                {c.authorName}
                {c.authorIsStaff && (
                  <span className="ml-1 rounded bg-[var(--color-neo-primary)]/15 px-1 text-[10px] text-[var(--color-neo-primary)]">
                    Staff
                  </span>
                )}
                <span className="ml-2 font-normal text-[var(--color-neo-text-secondary)]">
                  {relativeTime(c.createdAt)}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-neo-text-primary)]">{c.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="flex-1 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 text-sm shadow-[var(--shadow-neo-pressed)] outline-none focus:ring-2 focus:ring-[var(--color-neo-primary)]"
        />
        <Button type="button" variant="primary" disabled={!draft.trim() || posting} onClick={submit}>
          {posting ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
