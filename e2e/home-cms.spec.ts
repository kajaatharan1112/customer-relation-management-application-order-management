import { test, expect } from '@playwright/test'

// Admin curates the customisable Home page; customers and employees see it read-only.
test.use({ storageState: 'e2e/.auth/admin.json' })

const stamp = Date.now()
const PRODUCT = `E2E Poster ${stamp}`
const CATEGORY = `E2E Prints ${stamp}`
const PROMO = `E2E Expired promo ${stamp}`

test('admin edits Home; customer and employee see it read-only', async ({ page, browser }) => {
  // --- Admin: the page-layout editor is available ---
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: /page layout/i })).toBeVisible()

  // --- Admin adds a product ---
  await page.getByRole('button', { name: /add product/i }).click()
  await page.getByLabel('Name', { exact: true }).fill(PRODUCT)
  await page.getByLabel('Category', { exact: true }).fill(CATEGORY)
  await page.getByLabel('Price', { exact: true }).fill('4500')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: CATEGORY })).toBeVisible()
  await expect(page.getByText(PRODUCT)).toBeVisible()

  // --- Admin adds an already-expired advertisement ---
  await page.getByRole('button', { name: /add advertisement/i }).click()
  await page.getByLabel('Title', { exact: true }).fill(PROMO)
  await page.getByLabel('Ends at', { exact: true }).fill('2020-01-01')
  await page.getByRole('button', { name: 'Save' }).click()

  // Admin still sees it, badged Expired.
  const adminPromo = page.locator('div').filter({ hasText: PROMO }).last()
  await expect(adminPromo).toContainText(PROMO)
  await expect(adminPromo).toContainText(/expired/i)

  // --- Customer: read-only Home, no expired promo, orders list still reachable ---
  const customerCtx = await browser.newContext({ storageState: 'e2e/.auth/customer.json' })
  const customerPage = await customerCtx.newPage()
  await customerPage.goto('/portal')

  await expect(customerPage.getByText(PRODUCT)).toBeVisible()
  await expect(customerPage.getByText(PROMO)).toHaveCount(0)
  await expect(customerPage.getByRole('heading', { name: /page layout/i })).toHaveCount(0)
  await expect(customerPage.getByRole('button', { name: /add product/i })).toHaveCount(0)

  await customerPage.getByRole('link', { name: /my orders/i }).click()
  await expect(customerPage).toHaveURL(/\/portal\/bills$/)
  await expect(customerPage.getByRole('heading', { level: 1, name: 'My Bills' })).toBeVisible()
  await customerCtx.close()

  // --- Employee: read-only Home (no page-layout editor) ---
  const staffCtx = await browser.newContext({ storageState: 'e2e/.auth/staff.json' })
  const staffPage = await staffCtx.newPage()
  await staffPage.goto('/home')
  await expect(staffPage.getByText(PRODUCT)).toBeVisible()
  await expect(staffPage.getByRole('heading', { name: /page layout/i })).toHaveCount(0)
  await expect(staffPage.getByRole('button', { name: /add product/i })).toHaveCount(0)
  await staffCtx.close()
})
