import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createTaggedBill } from './helpers'

const here = dirname(fileURLToPath(import.meta.url))

test.use({ storageState: 'e2e/.auth/admin.json' })

test('staff uploads a file and it appears in the Files list', async ({ page }) => {
  await createTaggedBill(page, 'Order with a proof file')

  await expect(page.getByRole('heading', { name: 'Files' })).toBeVisible()
  await expect(page.getByText(/no files\./i)).toBeVisible()

  await page.getByLabel('Upload a file').setInputFiles(join(here, 'fixtures', 'sample.txt'))

  await expect(page.getByText('sample.txt')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible()
})
