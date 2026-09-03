import { test, expect } from '@playwright/test'

// Below the md breakpoint the MobileBottomBar <nav> is shown and the desktop
// Sidebar is display:none (so it is absent from the accessibility tree).
test.use({ storageState: 'e2e/.auth/admin.json', viewport: { width: 390, height: 844 } })

test('the bottom bar has exactly 4 tabs and no "Sales" or "Settings" tab', async ({ page }) => {
  await page.goto('/')

  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link')).toHaveCount(4)
  for (const name of ['Home', 'Dashboard', 'Customers', 'Bills']) {
    await expect(nav.getByRole('link', { name })).toBeVisible()
  }
  await expect(nav.getByRole('link', { name: 'Sales' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0)
})

test('the current route tab is aria-current and the desktop sidebar is hidden', async ({ page }) => {
  await page.goto('/')

  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('aside')).toBeHidden()
})

test('tapping "Bills" navigates and moves aria-current', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation')

  await nav.getByRole('link', { name: 'Bills' }).click()
  await expect(page).toHaveURL(/\/bills$/)

  await expect(nav.getByRole('link', { name: 'Bills' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page')
})

test('tapping "Home" opens the customisable home page', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation')

  await nav.getByRole('link', { name: 'Home' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
})
