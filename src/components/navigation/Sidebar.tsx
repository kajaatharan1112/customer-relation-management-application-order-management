import { NavLink } from 'react-router-dom'
import { Package } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { ROUTES } from '@/shared/constants/routes'
import { useRole } from '@/core/auth/auth.hooks'
import { sidebarNavFor } from '@/components/navigation/navConfig'

export function Sidebar() {
  const { isAdmin } = useRole()
  const nav = sidebarNavFor(isAdmin)
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[96px] flex-col items-center bg-[var(--color-neo-text-primary)] py-5 md:flex">
      <NavLink
        to={ROUTES.home}
        aria-label="Home"
        className="mb-7 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-neo-primary)] to-[var(--color-neo-primary-2)] text-white"
      >
        <Package size={18} />
      </NavLink>

      <nav className="flex w-full flex-1 flex-col items-center gap-1.5 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-3 transition-colors duration-200',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80',
              )
            }
          >
            <item.icon size={20} />
            <span className="text-[11px] font-medium leading-none tracking-wide">
              {item.shortLabel}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
