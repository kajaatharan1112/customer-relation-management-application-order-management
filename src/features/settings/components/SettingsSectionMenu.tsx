import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

export interface SettingsSection<K extends string = string> {
  key: K
  title: string
  description: string
  icon: LucideIcon
}

interface Props<K extends string> {
  sections: SettingsSection<K>[]
  onPick: (key: K) => void
}

export function SettingsSectionMenu<K extends string>({ sections, onPick }: Props<K>) {
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onPick(s.key)}
          className="flex w-full items-center gap-4 rounded-2xl border border-white/50 bg-[var(--color-neo-card)] p-4 text-left shadow-[var(--shadow-neo-soft)] transition hover:shadow-[var(--shadow-neo-floating)]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), #8b5cf6)' }}
          >
            <s.icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{s.title}</div>
            <div className="mt-0.5 text-xs text-[var(--color-neo-text-secondary)]">{s.description}</div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-[var(--color-neo-text-secondary)]" />
        </button>
      ))}
    </div>
  )
}
