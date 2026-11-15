import { chromium } from '../../../frontend/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({headless:true})
const base = process.argv[2] || 'http://localhost:5179'
for (const theme of ['light','dark']) {
  const page = await browser.newPage()
  await page.addInitScript(value => localStorage.setItem('app-theme',value), theme)
  for (const width of [375,1440]) {
    await page.setViewportSize({width,height:1000})
    for (const variant of ['scanner','atlas','comparison','inspection','drafting']) {
      await page.goto(`${base}/design/variants/${variant}?pipe=1250022871&segment=130`)
      await page.getByTestId('forecast-value').waitFor()
      await page.evaluate(()=>document.fonts.ready)
      for(let attempt=0;attempt<3;attempt++) {
        try { await page.screenshot({path:`work/audits/variants/screenshots/${variant}-1250022871-${theme}-${width}.png`,fullPage:true,animations:'disabled'}); break }
        catch(error) { if(attempt===2)throw error }
      }
    }
  }
  await page.setViewportSize({width:375,height:1000})
  await page.goto(`${base}/design/variants/drafting?pipe=1250009583&segment=1474`)
  await page.getByTestId('forecast-value').waitFor()
  await page.screenshot({path:`work/audits/variants/screenshots/four-digit-${theme}-375.png`,fullPage:true,animations:'disabled'})
  await page.close()
}
await browser.close()
