import { test, expect } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
}

test.describe('settings — members', () => {
  test('an employee has no Settings item and /settings redirects to the dashboard', async ({ page }) => {
    await signIn(page, 'staff@onevo.test')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  })

  test('an admin adds an employee with a temp password and sees the new row', async ({ page }) => {
    await signIn(page, 'admin@onevo.test')
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/settings')
    await page.getByRole('button', { name: /employees/i }).click()
    await page.getByRole('button', { name: /new employee/i }).click()
    const stamp = Date.now()
    await page.getByLabel(/full name/i).fill('E2E Worker')
    await page.getByLabel(/^email/i).fill(`worker.${stamp}@onevo.test`)
    await page.getByLabel(/set their password/i).fill('secret12345')
    // Sending the OTP already creates the member row (status: invited); the
    // admin-side flow doesn't need to complete verification to see it listed.
    await page.getByRole('dialog').getByRole('button', { name: /^send otp$/i }).click()
    await expect(page.getByText('E2E Worker')).toBeVisible()
  })
})
