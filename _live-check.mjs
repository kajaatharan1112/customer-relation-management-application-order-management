import { chromium } from '@playwright/test'

const URL = 'https://subiramaniyam-printing-works.vercel.app'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 812 }, isMobile: true, hasTouch: true })
const page = await ctx.newPage()

const consoleErrs = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()) })
page.on('pageerror', (e) => consoleErrs.push('PAGEERROR: ' + e.message))
const failed = []
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`))

for (const path of ['/', '/login']) {
  console.log(`\n===== ${URL}${path} =====`)
  const resp = await page.goto(`${URL}${path}`, { waitUntil: 'networkidle' }).catch((e) => { console.log('goto err', e.message); return null })
  await page.waitForTimeout(1500)
  console.log('final url:', page.url(), 'status:', resp && resp.status())
  const info = await page.evaluate((vw) => {
    const de = document.documentElement
    const offenders = []
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.right - vw > 1 || -r.left > 1) {
        const p = el.parentElement
        const pr = p ? p.getBoundingClientRect() : null
        if (!(pr && (pr.right - vw > 1 || -pr.left > 1))) {
          offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 160), L: Math.round(r.left), R: Math.round(r.right), w: Math.round(r.width), sw: el.scrollWidth })
        }
      }
    }
    return {
      docScrollW: de.scrollWidth, docClientW: de.clientWidth, innerW: window.innerWidth,
      bodyText: (document.body.innerText || '').slice(0, 300),
      rootChildren: document.getElementById('root')?.children.length ?? -1,
      hasViewportMeta: !!document.querySelector('meta[name=viewport]'),
      viewportMeta: document.querySelector('meta[name=viewport]')?.getAttribute('content'),
      offenders: offenders.slice(0, 20),
    }
  }, 390)
  console.log(JSON.stringify(info, null, 2))
}
console.log('\nCONSOLE ERRORS:', consoleErrs.length ? consoleErrs : 'none')
console.log('FAILED REQUESTS:', failed.length ? failed : 'none')
await browser.close()
console.log('\ndone')
