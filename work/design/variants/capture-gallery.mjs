import { chromium } from '../../../frontend/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({headless:true})
const page = await browser.newPage({viewport:{width:1440,height:1000}})
const base = process.argv[2] || 'http://localhost:5179'
await page.addInitScript(() => localStorage.setItem('app-theme','light'))
async function capture(name) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => scrollTo(0,0))
  for (let attempt=0; attempt<3; attempt++) {
    try { await page.screenshot({path:`work/audits/variants/screenshots/${name}.png`,fullPage:true,animations:'disabled'}); return }
    catch (error) { if (attempt===2) throw error; await page.evaluate(() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))) }
  }
}
await page.goto(`${base}/design/variants?pipe=1250022871&segment=130`)
await page.locator('img[src^="/design-previews/"]').last().waitFor()
await page.locator('img[src^="/design-previews/"]').evaluateAll(async images => { await Promise.all(images.map(img => img.decode())); if(images.length!==5 || images.some(img=>!img.naturalWidth)) throw new Error('missing preview') })
await capture('gallery-1440')
await page.setViewportSize({width:375,height:1000})
await capture('gallery-375')
await page.setViewportSize({width:2200,height:1100})
await page.getByRole('switch',{name:'Сравнить два экрана',exact:true}).check()
await page.getByTestId('forecast-value').nth(1).waitFor()
await capture('gallery-compare-2200')
await page.setViewportSize({width:375,height:1000})
await capture('gallery-compare-375')
await page.setViewportSize({width:1440,height:1000})
await page.goto(`${base}/design/variants/comparison?pipe=1250022871&segment=130`)
await page.getByRole('radio',{name:'Наложение',exact:true}).check()
await page.getByRole('slider',{name:/Граница/}).fill('35')
await capture('comparison-overlay')
const profile = await (await page.request.get(`${base}/api/v1/pipes/1250022871/profile`)).json()
const row = profile.rows.find(row => row.observations.some(observation => observation.run_date === '2022-07-06' && observation.residual_mm > row.forecast_mm))
await page.goto(`${base}/design/variants/comparison?pipe=1250022871&segment=${row.segment_id}`)
await page.getByTestId('forecast-value').waitFor()
await capture('comparison-negative')
await browser.close()
