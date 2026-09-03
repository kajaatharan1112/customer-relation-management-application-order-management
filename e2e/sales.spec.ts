import { test, expect } from '@playwright/test'
import { createTaggedBill } from './helpers'

test.use({ storageState: 'e2e/.auth/admin.json' })

// Structure-only unless data is created here first (shared suite DB — see
// dashboard.spec.ts note).

test('the sidebar "Sales" link opens /sales with its full structure', async ({ page }) => {
  await page.goto('/')

  // The 72px left rail link is named exactly "Sales" (the dashboard link is
  // "Sales detail").
  await page.getByRole('link', { name: 'Sales', exact: true }).click()
  await expect(page).toHaveURL(/\/sales$/)

  await expect(page.getByRole('heading', { level: 1, name: 'Sales & turnover' })).toBeVisible()
  await expect(page.getByText('Last 12 months')).toBeVisible()

  await expect(page.getByText('This month turnover')).toBeVisible()
  await expect(page.getByText('Turnover YTD')).toBeVisible()
  await expect(page.getByText('Avg bill value')).toBeVisible()
  await expect(page.getByText('Collection rate').first()).toBeVisible()

  for (const h of ['Collection rate', 'Top customers by turnover', 'Turnover by order type']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible()
  }

  await expect(page.getByRole('radiogroup', { name: 'Turnover range' })).toBeVisible()
})

test('the Turnover grain SegmentedControl switches', async ({ page }) => {
  await page.goto('/sales')
  const range = page.getByRole('radiogroup', { name: 'Turnover range' })

  await expect(range.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true')
  await range.getByRole('radio', { name: 'Yearly' }).click()
  await expect(range.getByRole('radio', { name: 'Yearly' })).toHaveAttribute('aria-checked', 'true')
  await expect(range.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'false')
})

test('"Turnover by order type" lists the tagged order type once a bill exists', async ({ page }) => {
  await createTaggedBill(page, 'Sales order-type breakdown')
  await page.goto('/sales')

  const byType = page
    .locator('div', { has: page.getByRole('heading', { name: 'Turnover by order type' }) })
    .last()
  await expect(byType.getByText('E2E Poster')).toBeVisible()
  // The collection donut may be empty or not depending on payments — don't assert it.
})
