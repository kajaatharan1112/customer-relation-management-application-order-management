import { Home, LayoutDashboard, Users, FileText, Settings, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { ROUTES } from '@/shared/constants/routes'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: ComponentType<{ size?: number | string; className?: string }>
}

/**
 * Full staff route set. The mobile bottom bar shows the first four
 * (Home / Dashboard / Customers / Bills); Settings is desktop-rail only.
 */
export const STAFF_NAV: NavItem[] = [
  { to: ROUTES.home, label: 'Home', shortLabel: 'Home', icon: Home },
  { to: ROUTES.dashboard, label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.customers, label: 'Customers', shortLabel: 'Customers', icon: Users },
  { to: ROUTES.bills, label: 'Bills', shortLabel: 'Bills', icon: FileText },
  { to: ROUTES.settings, label: 'Settings', shortLabel: 'Settings', icon: Settings },
]

export const MOBILE_NAV: NavItem[] = STAFF_NAV.slice(0, 4)

const SALES_ITEM: NavItem = { to: ROUTES.sales, label: 'Sales', shortLabel: 'Sales', icon: TrendingUp }
const SETTINGS_ITEM = STAFF_NAV.find((n) => n.to === ROUTES.settings)!

/**
 * Desktop rail nav. Everyone gets Dashboard/Customers/Bills + Sales; only an
 * admin gets Settings (the /settings route is admin-gated regardless).
 */
export function sidebarNavFor(isAdmin: boolean): NavItem[] {
  const base = STAFF_NAV.filter((n) => n.to !== ROUTES.settings)
  return isAdmin ? [...base, SALES_ITEM, SETTINGS_ITEM] : [...base, SALES_ITEM]
}

export const SIDEBAR_NAV: NavItem[] = sidebarNavFor(true)

export const PORTAL_NAV: NavItem[] = [
  { to: ROUTES.portalHome, label: 'Home', shortLabel: 'Home', icon: Home },
  { to: ROUTES.portalBills, label: 'My orders', shortLabel: 'Orders', icon: FileText },
]
