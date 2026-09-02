import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { STAFF_NAV } from '@/components/navigation/navConfig'

export function MobileBottomBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(54px+env(safe-area-inset-bottom,0px))] items-stretch border-t border-white/50 bg-[var(--color-neo-card)] pb-[env(safe-area-inset-bottom,0px)] shadow-[var(--shadow-neo-floating)] md:hidden">
      {STAFF_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
              isActive
                ? 'text-[var(--color-neo-primary)]'
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
