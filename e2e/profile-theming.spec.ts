import { test, expect, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

const primary = (page: Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-neo-primary').trim(),
  )

test.describe('profile menu — theming & edit', () => {
  test('picking an accent applies it and survives a reload', async ({ page }) => {
    await signIn(page, 'admin@onevo.test')

    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('button', { name: 'Rose theme' }).click()

    await expect.poll(() => primary(page)).toBe('#E11D48')
    // wait for the save to land before reloading, otherwise the in-flight
    // write is aborted by navigation
    await expect(page.getByText('Theme set to Rose')).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => primary(page)).toBe('#E11D48')

    // put it back so other specs see the default
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('button', { name: 'Indigo theme' }).click()
    await expect(page.getByText('Theme set to Indigo')).toBeVisible()
    await expect.poll(() => primary(page)).toBe('#5A7BFF')
  })

  test('editing the full name persists', async ({ page }) => {
    await signIn(page, 'admin@onevo.test')

    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Edit profile' }).click()

    const dialog = page.getByRole('dialog')
    const stamp = Date.now()
    const newName = `Admin E2E ${stamp}`
    await dialog.getByLabel('Full name').fill(newName)
    await dialog.getByRole('button', { name: /^save$/i }).click()

    await expect(page.getByText('Profile updated')).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Account menu' }).click()
    await expect(page.getByText(newName)).toBeVisible()
  })
})
