import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/admin.json' })

test('admin exports then purges the old completed bill', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /account maintenance/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Account maintenance' })).toBeVisible()

  // The seeded 2-year-old completed bill is eligible.
  await expect(page.getByText('Eligible to purge', { exact: false })).toBeVisible()

  const purge = page.getByRole('button', { name: /purge exported/i })
  await expect(purge).toBeDisabled()

  // Export downloads a ZIP and unlocks Purge.
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: /export eligible/i }).click()
  const file = await dl
  expect(file.suggestedFilename()).toMatch(/onevo-archive-.*\.zip/)

  await expect(purge).toBeEnabled({ timeout: 15_000 })

  await purge.click()
  await page.getByLabel(/type purge/i).fill('PURGE')
  await page.getByRole('dialog').getByRole('button', { name: /^permanently delete$/i }).click()

  // Stats refetch: nothing eligible remains, so Purge disables itself again.
  await expect(purge).toBeDisabled({ timeout: 15_000 })
})
