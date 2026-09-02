import { test, expect } from '@playwright/test'
import { E2E } from './global-setup'

test.use({ storageState: 'e2e/.auth/admin.json' })

test('create a bill with two rows, see the live total, then the detail', async ({ page }) => {
  await page.goto('/bills')
  await page.getByRole('button', { name: /new bill/i }).click()

  await page.getByLabel('Customer').selectOption(E2E.customerId)
  await page.getByRole('button', { name: /add row/i }).click()
  await page.getByLabel('Row 1 detail').fill('Banners')
  await page.getByLabel('Row 1 amount').fill('1000')
  await page.getByRole('button', { name: /add row/i }).click()
  await page.getByLabel('Row 2 detail').fill('Discount')
  await page.getByLabel('Row 2 amount').fill('-200')

  await expect(page.getByText(/Total:\s*LKR/)).toContainText('800')

  await page.getByRole('button', { name: /^save$/i }).click()
  await page.waitForURL(/\/bills\/[0-9a-f-]{36}$/)

  await expect(page.getByRole('heading', { name: /INV-\d{6}/ })).toBeVisible()
  await expect(page.getByText('Banners')).toBeVisible()
  await expect(page.getByText(/Total/).first()).toBeVisible()
})

test('change status and record a payment updates the balance', async ({ page }) => {
  await page.goto('/bills')
  await page.getByRole('button', { name: /new bill/i }).click()
  await page.getByLabel('Customer').selectOption(E2E.customerId)
  await page.getByRole('button', { name: /add row/i }).click()
  await page.getByLabel('Row 1 detail').fill('Flyers')
  await page.getByLabel('Row 1 amount').fill('500')
  await page.getByRole('button', { name: /^save$/i }).click()
  await page.waitForURL(/\/bills\/[0-9a-f-]{36}$/)

  await page.getByRole('button', { name: 'Active' }).click()
  await expect(page.getByText('Active').first()).toBeVisible()

  await page.getByRole('button', { name: /record payment/i }).click()
  await page.getByLabel(/total paid so far/i).fill('300')
  await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click()

  await expect(page.getByText('Balance').locator('xpath=following-sibling::td')).toContainText('200')
})
