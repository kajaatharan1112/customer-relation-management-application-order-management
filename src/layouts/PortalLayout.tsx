import { NavLink, Outlet } from 'react-router-dom'
import { Package } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { ROUTES } from '@/shared/constants/routes'
import { APP_NAME } from '@/shared/constants/app'
import { PORTAL_NAV } from '@/components/navigation/navConfig'
import { NavPillBar } from '@/components/navigation/NavPillBar'
import { ProfileMenu } from '@/features/profile/components/ProfileMenu'

export function PortalLayout() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[var(--color-neo-bg)]">
      <header className="flex h-[64px] items-center justify-between border-b border-white/10 bg-[var(--color-neo-text-primary)] px-5">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-neo-primary)] to-[var(--color-neo-primary-2)]">
            <Package size={16} />
          </span>
          <span className="text-base font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <ProfileMenu />
      </header>
      <nav className="hidden items-center gap-1 border-b border-white/40 bg-[var(--color-neo-card)] px-5 md:flex">
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
      <main className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-0">
        <Outlet />
      </main>
      <NavPillBar items={PORTAL_NAV} />
    </div>
  )
}
