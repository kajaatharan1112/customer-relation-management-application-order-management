import { LayoutDashboard, Users, FileText, Settings } from 'lucide-react'
import type { ComponentType } from 'react'
import { ROUTES } from '@/shared/constants/routes'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: ComponentType<{ size?: number | string; className?: string }>
}

export const STAFF_NAV: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { to: ROUTES.customers, label: 'Customers', shortLabel: 'Customers', icon: Users },
  { to: ROUTES.bills, label: 'Bills', shortLabel: 'Bills', icon: FileText },
  { to: ROUTES.settings, label: 'Settings', shortLabel: 'Settings', icon: Settings },
]

export const PORTAL_NAV: NavItem[] = [
  { to: ROUTES.portalHome, label: 'My Bills', shortLabel: 'Bills', icon: FileText },
]
