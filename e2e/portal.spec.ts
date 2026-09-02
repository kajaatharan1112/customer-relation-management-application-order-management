import { test, expect } from '@playwright/test'
import { createTaggedBill } from './helpers'

test.use({ storageState: 'e2e/.auth/admin.json' })

test('customer sees their bill in the portal and can post a comment', async ({ page, browser }) => {
  // 1. Staff creates a tagged bill for the customer.
  const billUrl = await createTaggedBill(page, 'Portal test order')
  const billId = billUrl.split('/').pop()!

  // 2. Switch to the customer session.
  const customerCtx = await browser.newContext({ storageState: 'e2e/.auth/customer.json' })
  const customerPage = await customerCtx.newPage()

  await customerPage.goto('/portal')
  await expect(customerPage.getByRole('heading', { level: 1, name: 'My Bills' })).toBeVisible()
  await expect(customerPage.getByText(/INV-\d{6}/).first()).toBeVisible()

  await customerPage.goto(`/portal/bills/${billId}`)
  await expect(customerPage.getByText('Portal test order')).toBeVisible()
  await expect(customerPage.getByRole('heading', { name: 'Progress' })).toBeVisible()
  await expect(customerPage.getByRole('heading', { name: 'Messages' })).toBeVisible()
  // read-only: no stepper buttons, no upload input
  await expect(customerPage.getByLabel('Upload a file')).toHaveCount(0)

  await customerPage.getByPlaceholder(/write a message/i).fill('Any update on my posters?')
  await customerPage.getByRole('button', { name: /^send$/i }).click()
  await expect(customerPage.getByText('Any update on my posters?')).toBeVisible()

  await customerCtx.close()
})

test('an unknown bill id shows "not found" in the portal', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: 'e2e/.auth/customer.json' })
  const p = await ctx.newPage()
  await p.goto('/portal/bills/00000000-0000-0000-0000-000000000000')
  await expect(p.getByText(/bill not found/i)).toBeVisible()
  await ctx.close()
})
