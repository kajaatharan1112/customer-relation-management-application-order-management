import { NavLink, Outlet } from 'react-router-dom'
import { Package, LogOut } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { ROUTES } from '@/shared/constants/routes'
import { PORTAL_NAV } from '@/components/navigation/navConfig'
import { authService } from '@/core/auth/auth.service'

export function PortalLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-neo-bg)]">
      <header className="flex h-[64px] items-center justify-between border-b border-white/10 bg-[var(--color-neo-text-primary)] px-5">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-neo-primary)] to-[#8b5cf6]">
            <Package size={16} />
          </span>
          <span className="text-base font-bold tracking-tight">ONEVO</span>
        </div>
        <button
          type="button"
          onClick={() => authService.signOut()}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-[var(--color-neo-danger)]"
        >
          <LogOut size={17} />
        </button>
      </header>
      <nav className="flex items-center gap-1 border-b border-white/40 bg-[var(--color-neo-card)] px-5">
        {PORTAL_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.portalHome}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-[var(--color-neo-primary)] text-[var(--color-neo-primary)]'
                  : 'border-transparent text-[var(--color-neo-text-secondary)] hover:text-[var(--color-neo-text-primary)]',
              )
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
