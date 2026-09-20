import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopBar } from '@/components/navigation/TopBar'
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar'
import { BackHomeBar } from '@/components/navigation/BackHomeBar'
import { MobileChromeProvider, useMobileBackHandler } from '@/components/navigation/MobileChromeContext'
import { SIDEBAR_NAV } from '@/components/navigation/navConfig'
import { APP_NAME } from '@/shared/constants/app'

function titleForPath(pathname: string): string {
  const match = SIDEBAR_NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  return match?.label ?? APP_NAME
}

/**
 * Swaps the mobile bottom nav for a Back/Home bar while a sub-screen is
 * active. Keyed on which bar is showing so it fully swaps in one commit (no
 * AnimatePresence exit-wait to desync) — the incoming bar just fades/slides in.
 */
function BottomChrome() {
  const onBack = useMobileBackHandler()
  return (
    <motion.div
      key={onBack ? 'back-home' : 'main-nav'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      {onBack ? <BackHomeBar onBack={onBack} /> : <MobileBottomBar />}
    </motion.div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <MobileChromeProvider>
      <div className="flex h-dvh overflow-hidden bg-[var(--color-neo-bg)]">
        <Sidebar />
        {/*
          md:bg dark = the chrome colour, so the light <main>'s md:rounded-tl-[40px]
          corner shows a clean curve against it. On desktop this dark only peeks at
          that rounded cut-out (TopBar/Sidebar/<main> cover everything else); no
          md: prefix would darken the mobile bottom-bar gutter, so it stays md-only.
        */}
        <div className="flex h-full flex-1 flex-col overflow-hidden pt-[64px] pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:bg-[var(--color-neo-text-primary)] md:pb-0 md:pl-[96px]">
          <TopBar title={titleForPath(pathname)} withSidebarOffset />
          <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-neo-bg)] md:rounded-tl-[40px]">
            {/*
              Plain keyed remount per route — no transition animation. The old
              framer-motion `AnimatePresence mode="wait"` fade desynced on rapid
              navigation and left the incoming screen stuck at opacity 0 (a blank
              screen). Content now paints immediately on every navigation.
            */}
            <div key={pathname} className="h-full">
              <Outlet />
            </div>
          </main>
        </div>
        <BottomChrome />
      </div>
    </MobileChromeProvider>
  )
}
