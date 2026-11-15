import { chromium } from '../../../frontend/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ headless: true })
const base = process.argv[2] || 'http://localhost:5179'
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage()
  await page.addInitScript(value => localStorage.setItem('app-theme', value), theme)
  for (const width of [375, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(`${base}/design/variants/inspection?pipe=1250022871&segment=130`)
    await page.getByTestId('forecast-value').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `work/audits/combined-inspection/screenshots/${theme}-${width}.png`, fullPage: true, animations: 'disabled' })
  }
  await page.close()
}
await browser.close()
