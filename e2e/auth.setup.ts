import { test as setup } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('e2e/.auth', { recursive: true })

const ROLES = [
  { key: 'admin', email: 'admin@onevo.test', landing: '/' },
  { key: 'staff', email: 'staff@onevo.test', landing: '/' },
  { key: 'customer', email: 'customer@onevo.test', landing: '/portal' },
] as const

for (const role of ROLES) {
  setup(`authenticate as ${role.key}`, async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(role.email)
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForURL(`**${role.landing}`, { timeout: 15_000 })
    await page.context().storageState({ path: `e2e/.auth/${role.key}.json` })
  })
}
