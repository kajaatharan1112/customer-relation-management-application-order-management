import { STAFF_NAV, SIDEBAR_NAV, mobileNavFor, sidebarNavFor } from '@/components/navigation/navConfig'
import { ROUTES } from '@/shared/constants/routes'

describe('nav config', () => {
  it('mobileNavFor(false) keeps the mobile bar at 4 tabs, Home first, no Settings', () => {
    const asEmployee = mobileNavFor(false)
    expect(asEmployee).toHaveLength(4)
    expect(asEmployee[0].to).toBe(ROUTES.home)
    expect(asEmployee.some((n) => n.to === ROUTES.sales)).toBe(false)
    expect(asEmployee.some((n) => n.to === ROUTES.settings)).toBe(false)
  })

  it('mobileNavFor(true) adds a 5th Settings tab for admins', () => {
    const asAdmin = mobileNavFor(true)
    expect(asAdmin).toHaveLength(5)
    expect(asAdmin[0].to).toBe(ROUTES.home)
    expect(asAdmin.some((n) => n.to === ROUTES.sales)).toBe(false)
    expect(asAdmin.some((n) => n.to === ROUTES.settings)).toBe(true)
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
