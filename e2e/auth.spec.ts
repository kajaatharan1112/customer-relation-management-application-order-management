import { test, expect } from '@playwright/test'

// Fresh, no stored session — exercises the login flow + role redirects.
test.use({ storageState: { cookies: [], origins: [] } })

test('admin signs in and lands on the staff dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@onevo.test')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
})

test('customer signs in and lands on the portal', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('customer@onevo.test')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/portal$/)
  // /portal is the customisable Home page; "My orders" links to the bills list.
  await expect(page.getByRole('link', { name: /my orders/i })).toBeVisible()
})

test('a signed-in customer cannot reach staff routes', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('customer@onevo.test')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/portal$/)

  await page.goto('/bills')
  await expect(page).toHaveURL(/\/portal$/)
})
