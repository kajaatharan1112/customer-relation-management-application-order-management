import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { WorkflowTemplateVM } from '@/features/settings/settings.types'

export function WorkflowList({
  templates,
  canWrite,
  onEdit,
  onDelete,
}: {
  templates: WorkflowTemplateVM[]
  canWrite: boolean
  onEdit: (t: WorkflowTemplateVM) => void
  onDelete: (t: WorkflowTemplateVM) => void
}) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-[var(--color-neo-text-secondary)]">
        No workflows yet — create one to define how an order type progresses.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-[var(--color-neo-text-primary)]">{t.name}</h4>
                <StatusBadge
                  label={t.isActive ? 'Active' : 'Inactive'}
                  color={t.isActive ? 'var(--color-neo-success)' : 'var(--color-neo-secondary)'}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.stages.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neo-bg)] px-2 py-0.5 text-xs"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                    {s.isFinal && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
            {canWrite && (
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(t)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
