import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopBar } from '@/components/navigation/TopBar'
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar'
import { STAFF_NAV } from '@/components/navigation/navConfig'

function titleForPath(pathname: string): string {
  const match = STAFF_NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  return match?.label ?? 'ONEVO'
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-neo-bg)]">
      <Sidebar />
      <div className="flex h-full flex-1 flex-col overflow-hidden pt-[64px] pb-[calc(54px+env(safe-area-inset-bottom,0px))] md:pb-0 md:pl-[72px]">
        <TopBar title={titleForPath(pathname)} withSidebarOffset />
        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-neo-bg)] md:rounded-tl-[40px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileBottomBar />
    </div>
  )
}
