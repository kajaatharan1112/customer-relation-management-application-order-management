import { test, expect, type Page } from '@playwright/test'
import { createTaggedBill } from './helpers'

/** No page should ever scroll horizontally on a phone — only the explicitly
 *  intentional filter-chip strips get overflow-x-auto, and those are scoped
 *  to their own row, not the document. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflowing).toBe(false)
}

test.describe('mobile viewport — no horizontal scroll', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.describe('staff', () => {
    test.use({ storageState: 'e2e/.auth/admin.json' })

    for (const path of ['/', '/home', '/customers', '/bills', '/settings']) {
      test(`${path} sits within the viewport width`, async ({ page }) => {
        await page.goto(path)
        await expectNoHorizontalOverflow(page)
      })
    }
  })

  test.describe('customer portal', () => {
    test.use({ storageState: 'e2e/.auth/customer.json' })

    for (const path of ['/portal', '/portal/bills']) {
      test(`${path} sits within the viewport width`, async ({ page }) => {
        await page.goto(path)
        await expectNoHorizontalOverflow(page)
      })
    }

    test('a bill detail page (with the rows table) sits within the viewport width', async ({
      page,
      browser,
    }) => {
      const adminCtx = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
      const adminPage = await adminCtx.newPage()
      const url = await createTaggedBill(adminPage, 'Mobile overflow check')
      const billId = url.split('/').pop()!
      await adminCtx.close()

      await page.goto(`/portal/bills/${billId}`)
      await expect(page.getByText('Mobile overflow check')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  })
})

test.describe('customer portal mobile bottom nav matches the staff style', () => {
  test.use({ storageState: 'e2e/.auth/customer.json' })

  test('mobile: floating pill bar shows, the desktop top tab-strip is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/portal')

    const pillBar = page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Orders', exact: true }) })
    await expect(pillBar).toBeVisible()
    await expect(pillBar.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
    await expect(pillBar.getByRole('link', { name: 'Orders', exact: true })).toBeVisible()

    // the desktop top tab-strip's "My orders" link is a different element and must not be visible on mobile
    await expect(page.getByRole('link', { name: /my orders/i })).toBeHidden()
  })

  test('desktop: the top tab-strip shows, the floating pill bar is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/portal')

    await expect(page.getByRole('link', { name: /my orders/i })).toBeVisible()
    // "Orders" (exact) is only the pill bar's shortLabel — the top strip's link is "My orders", not an exact match.
    await expect(page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Orders', exact: true }) })).toBeHidden()
  })
})
