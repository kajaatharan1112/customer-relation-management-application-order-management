import { chromium } from '@playwright/test'
const BASE = 'https://localhost:5173'
const W = 375

async function signIn(page, email) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForLoadState('networkidle')
}
async function offenders(page, label) {
  const r = await page.evaluate((vw) => {
    const de = document.documentElement
    const out = []
    for (const el of document.querySelectorAll('*')) {
      const b = el.getBoundingClientRect()
      if (b.width === 0 && b.height === 0) continue
      if (b.right - vw > 1 || -b.left > 1) {
        const p = el.parentElement, pr = p && p.getBoundingClientRect()
        if (!(pr && (pr.right - vw > 1 || -pr.left > 1)))
          out.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 150), L: Math.round(b.left), R: Math.round(b.right), w: Math.round(b.width), sw: el.scrollWidth })
      }
    }
    return { doc: de.scrollWidth, cw: de.clientWidth, out }
  }, W)
  const bad = r.doc > r.cw + 1
  console.log(`${bad ? 'XX' : 'ok'} ${label}  doc=${r.doc}/cw=${r.cw}`)
  for (const o of r.out) console.log(`     <${o.tag}> L${o.L} R${o.R} w${o.w} sw${o.sw} .${o.cls}`)
  return bad
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: 812 }, ignoreHTTPSErrors: true, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await signIn(page, 'admin@onevo.test')

// --- bill detail page ---
await page.goto(`${BASE}/bills`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const viewBtn = page.getByRole('link', { name: /view/i }).first()
if (await viewBtn.count()) {
  await viewBtn.click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  await offenders(page, `/bills/:id  (${page.url()})`)
} else {
  console.log('no bill to view — creating one')
}

// --- New bill modal + add a row (BillRowsEditor) ---
await page.goto(`${BASE}/bills`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /new bill/i }).click()
await page.waitForTimeout(500)
await offenders(page, 'BillFormModal (empty)')
const addRow = page.getByRole('button', { name: /add row/i })
if (await addRow.count()) {
  await addRow.click(); await addRow.click()
  await page.waitForTimeout(300)
  await offenders(page, 'BillFormModal + 2 rows (BillRowsEditor)')
}
await page.keyboard.press('Escape')

// --- Workflow modal + add stages (StageEditor) ---
await page.goto(`${BASE}/settings?tab=workflows`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const nw = page.getByRole('button', { name: /new workflow/i })
if (await nw.count()) {
  await nw.click(); await page.waitForTimeout(400)
  await offenders(page, 'WorkflowFormModal (empty)')
  const addStage = page.getByRole('button', { name: /add stage/i })
  if (await addStage.count()) { await addStage.click(); await addStage.click(); await page.waitForTimeout(300); await offenders(page, 'WorkflowFormModal + 2 stages (StageEditor)') }
  await page.keyboard.press('Escape')
}

// --- Order type + Member modals ---
await page.goto(`${BASE}/settings?tab=order-types`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const not = page.getByRole('button', { name: /new order type/i })
if (await not.count()) { await not.click(); await page.waitForTimeout(400); await offenders(page, 'OrderTypeFormModal'); await page.keyboard.press('Escape') }

await page.goto(`${BASE}/settings?tab=admins`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const nm = page.getByRole('button', { name: /new admin|add admin/i })
if (await nm.count()) { await nm.click(); await page.waitForTimeout(400); await offenders(page, 'MemberFormModal'); await page.keyboard.press('Escape') }

// --- Profile menu + Edit profile modal (NEW) ---
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Account menu' }).click()
await page.waitForTimeout(300)
await offenders(page, 'ProfileMenu dropdown open')
await page.getByRole('menuitem', { name: 'Edit profile' }).click()
await page.waitForTimeout(500)
await offenders(page, 'ProfileFormModal')

await browser.close()
console.log('\ndone')
