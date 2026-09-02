import { useRef } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { formatBytes } from '@/shared/utils/formatBytes'
import type { AttachmentVM } from '@/features/attachments/attachments.types'

const MAX_BYTES = 10 * 1024 * 1024

export function AttachmentList({
  attachments,
  canManage,
  onUpload,
  onRemove,
  onDownload,
}: {
  attachments: AttachmentVM[]
  canManage: boolean
  onUpload: (file: File) => void
  onRemove: (a: AttachmentVM) => void
  onDownload: (a: AttachmentVM) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            aria-label="Upload a file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (f.size > MAX_BYTES) {
                alert('File is larger than 10 MB.')
                return
              }
              onUpload(f)
            }}
          />
          <Button
            type="button"
            variant="ghost"
            icon={<Upload size={16} />}
            onClick={() => inputRef.current?.click()}
          >
            Upload file
          </Button>
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">No files.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 text-sm shadow-[var(--shadow-neo-pressed)]"
            >
              <span>
                {a.fileName}{' '}
                <span className="text-xs text-[var(--color-neo-text-secondary)]">
                  ({formatBytes(a.sizeBytes)})
                </span>
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  aria-label="Download"
                  onClick={() => onDownload(a)}
                  className="rounded p-1.5 hover:bg-[var(--color-neo-card)]"
                >
                  <Download size={16} />
                </button>
                {canManage && (
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => onRemove(a)}
                    className="rounded p-1.5 text-[var(--color-neo-danger)] hover:bg-[var(--color-neo-card)]"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
