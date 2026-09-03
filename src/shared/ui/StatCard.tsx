import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Card } from '@/shared/ui/Card'
import { Sparkline } from '@/shared/ui/Sparkline'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const TILE: Record<Tone, string> = {
  primary: 'bg-[var(--color-neo-primary)]/12 text-[var(--color-neo-primary)]',
  success: 'bg-[var(--color-neo-success)]/14 text-[var(--color-neo-success)]',
  warning: 'bg-[var(--color-neo-warning)]/18 text-[#a9750b]',
  danger: 'bg-[var(--color-neo-danger)]/12 text-[var(--color-neo-danger)]',
  neutral: 'bg-[var(--color-neo-text-secondary)]/16 text-[var(--color-neo-text-secondary)]',
}

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: Tone
  deltaPct?: number
  sub?: string
  spark?: number[]
  dense?: boolean
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  deltaPct,
  sub,
  spark,
  dense = false,
}: StatCardProps) {
  const up = (deltaPct ?? 0) >= 0
  const showMetaRow = deltaPct !== undefined || !!spark
  return (
    <Card className={dense ? 'p-[14px]' : 'p-[18px]'}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
          {label}
        </span>
        <span
          className={cn(
            'flex items-center justify-center',
            dense ? 'h-[28px] w-[28px] rounded-[8px]' : 'h-[34px] w-[34px] rounded-[10px]',
            TILE[tone],
          )}
        >
          <Icon size={dense ? 15 : 17} />
        </span>
      </div>
      <div
        className={cn(
          'font-extrabold tracking-tight text-[var(--color-neo-text-primary)]',
          dense ? 'mt-2 text-[20px]' : 'mt-2.5 text-[26px]',
        )}
      >
        {value}
      </div>
      {showMetaRow && (
        <div className={cn('flex items-center justify-between', dense ? 'mt-1.5' : 'mt-2')}>
          {deltaPct !== undefined ? (
            <span
              className={cn(
                'text-[11px] font-bold',
                up ? 'text-[var(--color-neo-success)]' : 'text-[var(--color-neo-danger)]',
              )}
            >
              {up ? '+' : ''}
              {Math.round(deltaPct)}%
            </span>
          ) : (
            <span />
          )}
          {spark && <Sparkline values={spark} className="h-7 w-24" />}
        </div>
      )}
      {sub && (
        <div
          className={cn('text-[11px] text-[var(--color-neo-text-secondary)]', dense ? 'mt-1' : 'mt-0.5')}
        >
          {sub}
        </div>
      )}
    </Card>
  )
}
