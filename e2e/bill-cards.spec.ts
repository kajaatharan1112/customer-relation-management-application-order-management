import { test, expect } from '@playwright/test'
import { createTaggedBill } from './helpers'

test.use({ storageState: 'e2e/.auth/admin.json' })

test('a bill renders as a card with View/Delete (no Edit) and search filters to it', async ({ page }) => {
  const url = await createTaggedBill(page, 'Bill card grid check')
  const id = url.split('/').pop()!
  const headingText = await page.getByRole('heading', { name: /INV-\d{6}/ }).first().innerText()
  const billNo = headingText.match(/INV-\d{6}/)![0]

  await page.goto('/bills')
  await page.getByRole('textbox', { name: 'Search bills' }).fill(billNo)

  await expect(page.getByText(billNo)).toBeVisible()
  // BillsPage passes no onEdit → the grid cards have View + Delete only.
  await expect(page.getByRole('button', { name: 'View' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)

  await page.getByRole('button', { name: 'View' }).click()
  await expect(page).toHaveURL(new RegExp(`/bills/${id}$`))
})

test('a status filter chip toggles aria-pressed', async ({ page }) => {
  await page.goto('/bills')

  const all = page.getByRole('button', { name: 'All', exact: true })
  const pending = page.getByRole('button', { name: 'Pending', exact: true })

  await expect(all).toHaveAttribute('aria-pressed', 'true')
  await expect(pending).toHaveAttribute('aria-pressed', 'false')

  await pending.click()
  await expect(pending).toHaveAttribute('aria-pressed', 'true')
  await expect(all).toHaveAttribute('aria-pressed', 'false')
})

test('searching for a non-existent bill shows the empty grid message', async ({ page }) => {
  await page.goto('/bills')
  await page.getByRole('textbox', { name: 'Search bills' }).fill('zzzz-no-such-bill')
  await expect(page.getByText('No bills found.')).toBeVisible()
})
