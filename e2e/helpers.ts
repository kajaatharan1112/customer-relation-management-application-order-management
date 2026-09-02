import { expect, type Page } from '@playwright/test'
import { E2E } from './global-setup'

/**
 * Creates a bill for the seeded "Cathy Customer" with a single row tagged with
 * the E2E order type, then waits for the bill detail page. Returns the bill URL.
 * Assumes the page is already authenticated as a staff member.
 */
export async function createTaggedBill(page: Page, detail: string): Promise<string> {
  await page.goto('/bills')
  await page.getByRole('button', { name: /new bill/i }).click()

  await page.getByLabel('Customer').selectOption(E2E.customerId)
  await page.getByRole('button', { name: /add row/i }).click()
  await page.getByLabel('Row 1 detail').fill(detail)
  await page.getByLabel('Row 1 order type').selectOption(E2E.orderTypeId)

  await page.getByRole('button', { name: /^save$/i }).click()
  await page.waitForURL(/\/bills\/[0-9a-f-]{36}$/)
  return page.url()
}

export async function expectToast(page: Page, text: RegExp) {
  await expect(page.getByText(text)).toBeVisible()
}
