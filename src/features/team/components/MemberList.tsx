import { motion } from 'framer-motion'
import { Mail, Phone, Pencil, Ban, RotateCcw } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { MEMBER_ROLE_LABEL, MEMBER_STATUS_COLOR, MEMBER_STATUS_LABEL } from '@/shared/constants/memberRoles'
import type { MemberVM } from '@/features/team/team.types'

export interface MemberListProps {
  members: MemberVM[]
  onEdit: (m: MemberVM) => void
  onSetStatus: (m: MemberVM, status: 'active' | 'disabled') => void
  emptyCopy: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function MemberList({ members, onEdit, onSetStatus, emptyCopy }: MemberListProps) {
  if (members.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">{emptyCopy}</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => {
        const canDisable = m.status === 'active' && !m.isSelf
        const canEnable = m.status === 'disabled'
        const footerCols = 1 + (canDisable || canEnable ? 1 : 0)
        return (
          <motion.div
            key={m.profileId}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)]"
          >
            <div className="flex items-center gap-3 p-4">
              <span
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), #8b5cf6)' }}
              >
                {initials(m.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-[var(--color-neo-text-primary)]">
                  {m.fullName}
                  {m.isSelf && <span className="ml-1 text-xs font-normal text-[var(--color-neo-text-secondary)]">(you)</span>}
                </div>
                <div className="truncate text-xs text-[var(--color-neo-text-secondary)]">{MEMBER_ROLE_LABEL[m.role]}</div>
              </div>
              <StatusBadge label={MEMBER_STATUS_LABEL[m.status]} color={MEMBER_STATUS_COLOR[m.status]} />
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--color-neo-secondary)]/15 p-4 text-[13px] text-[var(--color-neo-text-secondary)]">
              <span className="flex items-center gap-2.5">
                <Mail size={15} className="shrink-0" />
                <span className="truncate">{m.email}</span>
              </span>
              <span className="flex items-center gap-2.5">
                <Phone size={15} className="shrink-0" />
                {m.phone ?? <span className="italic text-[var(--color-neo-text-secondary)]/70">No phone</span>}
              </span>
            </div>

            <div className="grid gap-2 px-4 pb-4 pt-2" style={{ gridTemplateColumns: `repeat(${footerCols}, minmax(0, 1fr))` }}>
              <button
                type="button"
                onClick={() => onEdit(m)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95"
              >
                <Pencil size={15} />Edit
              </button>
              {canDisable && (
                <button
                  type="button"
                  onClick={() => onSetStatus(m, 'disabled')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 py-2.5 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95"
                >
                  <Ban size={15} />Disable
                </button>
              )}
              {canEnable && (
                <button
                  type="button"
                  onClick={() => onSetStatus(m, 'active')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-neo-success)]/12 py-2.5 text-xs font-semibold text-[var(--color-neo-success)] transition active:scale-95"
                >
                  <RotateCcw size={15} />Enable
                </button>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
