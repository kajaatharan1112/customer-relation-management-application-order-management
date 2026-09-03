import { motion } from 'framer-motion'
import { Workflow, ArrowRight, Check, Pencil, Trash2 } from 'lucide-react'
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
      <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">
        No workflows yet — create one to define how an order type progresses.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {templates.map((t) => (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]"
        >
          <div className="flex items-start gap-3 p-4">
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), #8b5cf6)' }}
            >
              <Workflow size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--color-neo-text-primary)]">{t.name}</div>
              {t.description !== null && (
                <div className="mt-0.5 truncate text-xs text-[var(--color-neo-text-secondary)]">{t.description}</div>
              )}
            </div>
            <StatusBadge
              label={t.isActive ? 'Active' : 'Inactive'}
              color={t.isActive ? 'var(--color-neo-success)' : 'var(--color-neo-secondary)'}
            />
          </div>

          <div className="border-t border-[var(--color-neo-secondary)]/15 px-4 pb-4 pt-4">
            {t.stages.length === 0 ? (
              <p className="text-xs text-[var(--color-neo-text-secondary)]">No stages</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {t.stages.map((s, i) => (
                  <span key={s.id} className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neo-surface)] px-2 py-0.5 text-xs shadow-[var(--shadow-neo-pressed)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                      {s.isFinal && <Check size={11} />}
                    </span>
                    {i < t.stages.length - 1 && (
                      <ArrowRight size={12} className="text-[var(--color-neo-text-secondary)]" />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {canWrite && (
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={() => onEdit(t)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95"
              >
                <Pencil size={15} />Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(t)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95"
              >
                <Trash2 size={15} />Delete
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
