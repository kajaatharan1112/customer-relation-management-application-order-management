import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopBar } from '@/components/navigation/TopBar'
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar'
import { SIDEBAR_NAV } from '@/components/navigation/navConfig'

function titleForPath(pathname: string): string {
  const match = SIDEBAR_NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  return match?.label ?? 'ONEVO'
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-neo-bg)]">
      <Sidebar />
      {/*
        md:bg dark = the chrome colour, so the light <main>'s md:rounded-tl-[40px]
        corner shows a clean curve against it. On desktop this dark only peeks at
        that rounded cut-out (TopBar/Sidebar/<main> cover everything else); no
        md: prefix would darken the mobile bottom-bar gutter, so it stays md-only.
      */}
      <div className="flex h-full flex-1 flex-col overflow-hidden pt-[64px] pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:bg-[var(--color-neo-text-primary)] md:pb-0 md:pl-[72px]">
        <TopBar title={titleForPath(pathname)} withSidebarOffset />
        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-neo-bg)] md:rounded-tl-[40px]">
          {/*
            Plain keyed remount per route — no transition animation. The old
            framer-motion `AnimatePresence mode="wait"` fade desynced on rapid
            navigation and left the incoming screen stuck at opacity 0 (a blank
            screen). Content now paints immediately on every navigation.
          */}
          <div key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomBar />
    </div>
  )
}
