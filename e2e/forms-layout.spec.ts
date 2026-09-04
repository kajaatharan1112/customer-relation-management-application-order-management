import { test, expect, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function openAddCustomer(page: Page) {
  await page.goto('/customers')
  await page.getByRole('button', { name: /add customer/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // let the open animation (framer-motion scale/translate) settle before measuring
  await page.waitForTimeout(500)
}

/** Rects of the Full name + Email inputs, read in a single frame so an in-flight
 *  animation can't skew one relative to the other. */
function fieldRects(page: Page) {
  return page.evaluate(() => {
    const r = (label: string) => {
      const el = [...document.querySelectorAll('label')].find((l) =>
        new RegExp(label, 'i').test(l.textContent ?? ''),
      )
      const input = el && document.getElementById(el.getAttribute('for') ?? '')
      const b = input!.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    const dialog = document.querySelector('[role="dialog"]')!.getBoundingClientRect()
    return { name: r('^full name'), email: r('^email'), dialogWidth: dialog.width }
  })
}

test.describe('modal form layout', () => {
  test('desktop: fields sit two-per-row; mobile: they stack', async ({ page }) => {
    await signIn(page, 'admin@onevo.test')

    // desktop (default 1280 viewport)
    await openAddCustomer(page)
    let m = await fieldRects(page)
    // same row → tops aligned, email to the right of name
    expect(Math.abs(m.name.y - m.email.y)).toBeLessThan(6)
    expect(m.email.x).toBeGreaterThan(m.name.x + m.name.w - 4)
    // the lg dialog is genuinely wide
    expect(m.dialogWidth).toBeGreaterThan(760)

    await page.keyboard.press('Escape')

    // mobile
    await page.setViewportSize({ width: 390, height: 844 })
    await openAddCustomer(page)
    m = await fieldRects(page)
    // stacked → email below name, left edges aligned
    expect(m.email.y).toBeGreaterThan(m.name.y + m.name.h - 4)
    expect(Math.abs(m.email.x - m.name.x)).toBeLessThan(6)
  })

  test('the body scrolls while header and footer stay pinned', async ({ page }) => {
    await signIn(page, 'admin@onevo.test')
    await page.setViewportSize({ width: 1280, height: 640 })
    await openAddCustomer(page)

    const dialog = page.getByRole('dialog')
    const title = dialog.getByRole('heading', { name: 'Add customer' })
    const saveBtn = dialog.getByRole('button', { name: /^save$/i })
    const body = dialog.locator('[data-modal-body]')

    await expect(title).toBeVisible()
    await expect(saveBtn).toBeVisible()

    // the actions live in the pinned footer, not inside the scroll region
    await expect(body.getByRole('button', { name: /^save$/i })).toHaveCount(0)

    // body is actually overflowing, and scrolling it moves only its own content
    expect(await body.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0)
    const scrollTop = await body.evaluate((el) => {
      el.scrollTo(0, el.scrollHeight)
      return el.scrollTop
    })
    expect(scrollTop).toBeGreaterThan(0)

    // header + footer are still on screen after the body scrolled to the bottom
    await expect(title).toBeVisible()
    await expect(saveBtn).toBeVisible()
  })
})
