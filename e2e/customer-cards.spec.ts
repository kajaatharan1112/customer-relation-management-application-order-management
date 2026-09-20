import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/admin.json' })

// Seeded "Cathy Customer" is always present. Her bill count varies across the
// shared suite DB, so assert the chip's shape, not its number.

test('the Cathy Customer row shows a bills chip and an Edit/Block menu', async ({ page }) => {
  await page.goto('/customers')
  const list = page.getByTestId('customers-list-pane')
  await page.getByRole('textbox', { name: 'Search customers' }).fill('cathy')

  await expect(list.getByText('Cathy Customer')).toBeVisible()
  await expect(list.getByText(/\d+ bills?/)).toBeVisible()

  await page.getByRole('button', { name: 'Actions for Cathy Customer' }).click()
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(1)
  await expect(page.getByRole('menuitem', { name: 'Block' })).toHaveCount(1)
})

test('search narrows the list and an unmatched query shows the empty message', async ({ page }) => {
  await page.goto('/customers')
  const list = page.getByTestId('customers-list-pane')
  const search = page.getByRole('textbox', { name: 'Search customers' })

  await search.fill('cathy')
  await expect(list.getByText('Cathy Customer')).toBeVisible()

  await search.fill('zzzz-no-such-customer')
  await expect(list.getByText('No customers yet — add your first.')).toBeVisible()
  await expect(list.getByText('Cathy Customer')).toHaveCount(0)
})

test('clicking Edit opens the customer dialog and it can be closed', async ({ page }) => {
  await page.goto('/customers')
  await page.getByRole('textbox', { name: 'Search customers' }).fill('cathy')

  await page.getByRole('button', { name: 'Actions for Cathy Customer' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit customer' })
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})
