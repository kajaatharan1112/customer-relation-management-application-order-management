import { NavLink } from 'react-router-dom'
import { Package } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { STAFF_NAV } from '@/components/navigation/navConfig'

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col items-center bg-[var(--color-neo-text-primary)] py-4 md:flex">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-neo-primary)] to-[#8b5cf6] text-white shadow-lg">
        <Package size={18} />
      </div>

      <nav className="flex w-full flex-1 flex-col items-center gap-1 px-2">
        {STAFF_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 transition-all duration-200',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/45 hover:bg-white/10 hover:text-white/80',
              )
            }
          >
            <item.icon size={18} />
            <span className="text-[9px] font-semibold leading-none tracking-wide">
              {item.shortLabel}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
