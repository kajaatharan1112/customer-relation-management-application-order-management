import type { WorkflowStageVM } from '@/features/settings/settings.types'
import { cn } from '@/shared/utils/cn'

export function StageStepper({
  stages,
  currentStageId,
  onPick,
}: {
  stages: WorkflowStageVM[]
  currentStageId: string | null
  onPick?: (stageId: string) => void
}) {
  const currentIdx = stages.findIndex((s) => s.id === currentStageId)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {stages.map((s, i) => {
        const isCurrent = s.id === currentStageId
        const isDone = currentIdx >= 0 && i < currentIdx
        const content = (
          <span
            {...(isCurrent ? { 'data-current': true } : {})}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition',
              isCurrent
                ? 'text-white'
                : isDone
                  ? 'text-[var(--color-neo-text-primary)]'
                  : 'text-[var(--color-neo-text-secondary)]',
            )}
            style={isCurrent ? { background: s.color } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: isCurrent || isDone ? s.color : 'var(--color-neo-secondary)' }}
            />
            {s.name}
          </span>
        )
        return onPick ? (
          <button
            key={s.id}
            type="button"
            aria-label={s.name}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onPick(s.id)}
            className="rounded-full hover:bg-[var(--color-neo-bg)]"
          >
            {content}
          </button>
        ) : (
          <span key={s.id}>{content}</span>
        )
      })}
    </div>
  )
}
