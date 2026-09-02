import { test, expect } from '@playwright/test'
import { createTaggedBill } from './helpers'

test.use({ storageState: 'e2e/.auth/admin.json' })

// Realtime depends on the local Realtime service being healthy; give it room.
test('a staff comment appears on the customer portal without a reload', async ({ page, browser }) => {
  test.slow()

  const billUrl = await createTaggedBill(page, 'Realtime order')
  const billId = billUrl.split('/').pop()!

  const customerCtx = await browser.newContext({ storageState: 'e2e/.auth/customer.json' })
  const customerPage = await customerCtx.newPage()
  await customerPage.goto(`/portal/bills/${billId}`)
  await expect(customerPage.getByText('Realtime order')).toBeVisible()

  // Staff posts a message on the same bill.
  await page.getByPlaceholder(/write a message/i).fill('Your order just started printing.')
  await page.getByRole('button', { name: /^send$/i }).click()
  await expect(page.getByText('Your order just started printing.')).toBeVisible()

  // Customer page updates on its own (realtime → query invalidation).
  await expect(customerPage.getByText('Your order just started printing.')).toBeVisible({
    timeout: 15_000,
  })

  await customerCtx.close()
})
