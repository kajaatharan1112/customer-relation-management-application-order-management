import { STAFF_NAV, MOBILE_NAV, SIDEBAR_NAV, sidebarNavFor } from '@/components/navigation/navConfig'
import { ROUTES } from '@/shared/constants/routes'

describe('nav config', () => {
  it('keeps the mobile bar at 4 tabs, Home first', () => {
    expect(MOBILE_NAV).toHaveLength(4)
    expect(MOBILE_NAV[0].to).toBe(ROUTES.home)
    expect(MOBILE_NAV.some((n) => n.to === ROUTES.sales)).toBe(false)
    expect(MOBILE_NAV.some((n) => n.to === ROUTES.settings)).toBe(false)
  })

  it('STAFF_NAV leads with Home', () => {
    expect(STAFF_NAV[0].to).toBe(ROUTES.home)
  })

  it('sidebarNavFor(false) omits Settings but keeps Sales', () => {
    const asEmployee = sidebarNavFor(false)
    expect(asEmployee.some((n) => n.to === ROUTES.settings)).toBe(false)
    expect(asEmployee.some((n) => n.to === ROUTES.sales)).toBe(true)
    expect(asEmployee.some((n) => n.to === ROUTES.dashboard)).toBe(true)
  })

  it('sidebarNavFor(true) includes Settings, and SIDEBAR_NAV is the admin view', () => {
    const asAdmin = sidebarNavFor(true)
    expect(asAdmin.some((n) => n.to === ROUTES.settings)).toBe(true)
    expect(SIDEBAR_NAV).toEqual(asAdmin)
  })
})
