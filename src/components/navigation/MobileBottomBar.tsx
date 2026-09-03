import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { MOBILE_NAV } from '@/components/navigation/navConfig'

export function MobileBottomBar() {
  return (
    <nav
      className={cn(
        'fixed inset-x-3 z-40 flex h-16 items-center gap-1 rounded-[var(--radius-neo-pill)] px-2 md:hidden',
        'border border-white/60 bg-[var(--color-neo-card)]/60',
        'shadow-[0_10px_34px_rgba(43,45,66,0.18)] backdrop-blur-[22px] backdrop-saturate-[1.85]',
        '[bottom:calc(16px+env(safe-area-inset-bottom,0px))]',
      )}
      style={{ boxShadow: '0 10px 34px rgba(43,45,66,0.18), inset 0 1px 0 rgba(255,255,255,0.85)' }}
    >
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-1.5 text-[10px] font-semibold transition-colors',
              isActive
                ? 'bg-[var(--color-neo-primary)]/16 text-[var(--color-neo-primary)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.6)]'
                : 'text-[var(--color-neo-text-secondary)]',
            )
          }
        >
          <item.icon size={20} />
          {item.shortLabel}
        </NavLink>
      ))}
    </nav>
  )
}
