import { test, expect } from '@playwright/test'
import { createTaggedBill } from './helpers'

test.use({ storageState: 'e2e/.auth/admin.json' })

test('advancing a tagged row through the stepper records history', async ({ page }) => {
  // The stage-change note uses window.prompt — auto-answer it.
  page.on('dialog', (d) => d.accept('E2E: moved to printing'))

  await createTaggedBill(page, 'A2 event posters')

  const historyCard = page.locator('div', { has: page.getByRole('heading', { name: 'History' }) }).last()
  await expect(historyCard.getByText(/no stage changes yet/i)).toBeVisible()

  // The stepper renders each workflow stage as a button (aria-label = stage name).
  await page.getByRole('button', { name: 'Printing' }).click()

  await expect(historyCard.getByText(/no stage changes yet/i)).toBeHidden()
  await expect(historyCard.getByRole('listitem').first()).toContainText('A2 event posters')
  await expect(historyCard.getByRole('listitem').first()).toContainText('Printing')
  await expect(historyCard.getByText(/E2E: moved to printing/)).toBeVisible()
})
