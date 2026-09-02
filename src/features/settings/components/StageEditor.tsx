import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import type { EditableStage } from '@/features/settings/settings.types'

const PALETTE = ['#5A7BFF', '#39C16C', '#F4B740', '#F45B69', '#8b5cf6', '#0ea5e9']

export function StageEditor({
  stages,
  onChange,
}: {
  stages: EditableStage[]
  onChange: (next: EditableStage[]) => void
}) {
  const update = (i: number, patch: Partial<EditableStage>) =>
    onChange(stages.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= stages.length) return
    const next = [...stages]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const remove = (i: number) => onChange(stages.filter((_, idx) => idx !== i))

  const add = () => onChange([...stages, { name: '', color: PALETTE[0], isFinal: false }])

  const setFinal = (i: number) => onChange(stages.map((s, idx) => ({ ...s, isFinal: idx === i })))

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-neo-text-primary)]">Stages</h3>

      {stages.map((s, i) => (
        <div
          key={s.id ?? `new-${i}`}
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-bg)] p-2 shadow-[var(--shadow-neo-pressed)]"
        >
          <select
            aria-label="Stage color"
            value={s.color}
            onChange={(e) => update(i, { color: e.target.value })}
            className="h-9 w-9 shrink-0 rounded-md border-0"
            style={{ background: s.color }}
          >
            {PALETTE.map((c) => (
              <option key={c} value={c} style={{ background: c }} />
            ))}
          </select>

          <input
            aria-label={`Stage ${i + 1} name`}
            placeholder="Stage name"
            value={s.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="h-9 min-w-[8rem] flex-1 rounded-[var(--radius-neo-sm)] bg-[var(--color-neo-surface)] px-2 text-sm text-[var(--color-neo-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-neo-primary)]"
          />

          <label className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-neo-text-secondary)]">
            <input
              type="radio"
              name="final-stage"
              aria-label="Final stage"
              checked={s.isFinal}
              onChange={() => setFinal(i)}
            />
            Final
          </label>

          <button
            type="button"
            aria-label="Move up"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            className="shrink-0 rounded p-1.5 hover:bg-[var(--color-neo-card)] disabled:opacity-30"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            aria-label="Move down"
            onClick={() => move(i, 1)}
            disabled={i === stages.length - 1}
            className="shrink-0 rounded p-1.5 hover:bg-[var(--color-neo-card)] disabled:opacity-30"
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            aria-label="Delete stage"
            onClick={() => remove(i)}
            className="shrink-0 rounded p-1.5 text-[var(--color-neo-danger)] hover:bg-[var(--color-neo-card)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={add}>
        Add stage
      </Button>
    </div>
  )
}
