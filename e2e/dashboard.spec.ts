import { test, expect } from '@playwright/test'
import { createTaggedBill } from './helpers'

test.use({ storageState: 'e2e/.auth/admin.json' })

// NOTE: global-setup resets the DB once for the whole suite, and specs that run
// alphabetically earlier create bills. So this file only asserts STRUCTURE
// unconditionally; any non-empty-data assertion happens after its own
// createTaggedBill call. Never assert a fresh/empty-DB state here.

test('dashboard renders its structure', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()

  const kpis = page.getByTestId('kpi-cards')
  await expect(kpis).toBeVisible()
  for (const label of ['Outstanding', 'In progress', 'Completed', 'Customers']) {
    await expect(kpis.getByText(label, { exact: true })).toBeVisible()
  }

  for (const h of ['Monthly turnover', 'Recent bills', 'Bills by status', 'Quick actions']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible()
  }

  const range = page.getByRole('radiogroup', { name: 'Turnover range' })
  await expect(range).toBeVisible()
  await expect(range.getByRole('radio')).toHaveCount(3)
  await expect(range.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true')

  await expect(page.getByRole('link', { name: 'Sales detail' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View all' })).toBeVisible()

  const quick = page.locator('div', { has: page.getByRole('heading', { name: 'Quick actions' }) }).last()
  for (const b of ['New bill', 'Add customer', 'Settings']) {
    await expect(quick.getByRole('button', { name: b })).toBeVisible()
  }
})

test('the turnover range SegmentedControl moves the checked radio', async ({ page }) => {
  await page.goto('/')
  const range = page.getByRole('radiogroup', { name: 'Turnover range' })

  await expect(range.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true')

  await range.getByRole('radio', { name: 'Daily' }).click()
  await expect(range.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'true')
  await expect(range.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'false')

  await range.getByRole('radio', { name: 'Yearly' }).click()
  await expect(range.getByRole('radio', { name: 'Yearly' })).toHaveAttribute('aria-checked', 'true')
})

test('"Sales detail" navigates to /sales', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sales detail' }).click()
  await expect(page).toHaveURL(/\/sales$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Sales & turnover' })).toBeVisible()
})

test('after a bill exists the turnover chart has data and Recent bills lists it', async ({ page }) => {
  await createTaggedBill(page, 'Dashboard turnover order')
  await page.goto('/')

  // The empty placeholder must be gone once a billed order exists.
  await expect(page.getByText('No sales in this range')).toHaveCount(0)

  // RecentBillsList renders each bill as a <button> whose text includes its number.
  await expect(page.getByRole('button', { name: /INV-\d{6}/ }).first()).toBeVisible()
})
