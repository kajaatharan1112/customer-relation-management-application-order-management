import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/features/auth/authShared'
import { Button } from '@/shared/ui/Button'
import type { PurgeStats } from '@/features/maintenance/maintenance.types'

const ROWS: { key: keyof PurgeStats; label: string }[] = [
  { key: 'bills', label: 'Bills' },
  { key: 'billRows', label: 'Line items' },
  { key: 'comments', label: 'Comments' },
  { key: 'attachments', label: 'Attachments' },
]

export function PurgeConfirmModal({
  counts,
  onCancel,
  onConfirm,
}: {
  counts: PurgeStats
  onCancel: () => void
  onConfirm: () => void
}) {
  const [word, setWord] = useState('')
  return (
    <Modal open onClose={onCancel} title="Permanently delete archived data?">
      <div className="flex items-start gap-2.5 rounded-xl bg-[var(--color-neo-danger)]/10 p-3 text-[13px] text-[var(--color-neo-danger)]">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        This cannot be undone. Make sure you have downloaded the export first.
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-sm">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between">
            <span className="text-[var(--color-neo-text-secondary)]">{r.label}</span>
            <span className="font-semibold text-[var(--color-neo-text-primary)]">{counts[r.key]}</span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Field
          id="purge-word"
          label='Type PURGE to confirm'
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={word !== 'PURGE'} onClick={onConfirm}>
          Permanently delete
        </Button>
      </div>
    </Modal>
  )
}
