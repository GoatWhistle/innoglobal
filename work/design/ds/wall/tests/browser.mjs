import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(new URL('../../../../../frontend/package.json', import.meta.url))
const { chromium } = require('playwright')
const AxeBuilder = require('@axe-core/playwright').default
const base = 'http://127.0.0.1:5178/work/design/ds/'
const out = resolve('work/audits/pipe-style')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const errors = [], results = []
const watch = (page) => page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
const ready = (page) => page.waitForSelector('html[data-ready]')
const selected = (page) => page.locator('#main').getAttribute('data-selected-segment')
const mode = (page) => page.locator('#main').getAttribute('data-mode')
const settle = (page) => page.waitForFunction(() => window.wallDiagnostics.stats().moving === false)

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage(); watch(page)
  await page.goto(`${base}screen-pipe.html`); await ready(page)
  await page.waitForFunction(() => document.querySelector('[data-scene]').dataset.renderer === 'ready')
  assert.equal(await selected(page), '630'); assert.equal(await mode(page), 'route')
  const strip = page.locator('[data-strip]')
  await strip.focus(); await page.keyboard.press('ArrowRight'); assert.equal(await selected(page), '631')
  await page.keyboard.press('PageDown'); assert.equal(await selected(page), '621')
  await page.keyboard.press('End'); assert.equal(await selected(page), '1199')
  await page.keyboard.press('Home'); assert.equal(await selected(page), '0')
  await page.locator('#distance').fill('6300'); await page.locator('#distance').press('Enter'); assert.equal(await selected(page), '630')
  await page.locator('#distance').fill('abc'); await page.locator('#distance').press('Enter'); assert.equal(await page.locator('#distance').getAttribute('aria-invalid'), 'true')
  results.push('strip keyboard, coordinate input and validation passed')

  const box = await page.locator('[data-scene] canvas').boundingBox()
  await settle(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5 + 40)
  const routeClick = await selected(page)
  await page.getByRole('radio', { name: /Развёртка/ }).click(); assert.equal(await mode(page), 'unroll')
  const frames = await page.evaluate(() => new Promise((done) => { const t = []; let last = performance.now(); const tick = (now) => { t.push(now - last); last = now; if (window.wallDiagnostics.stats().moving) requestAnimationFrame(tick); else done(t) }; requestAnimationFrame(tick) }))
  await settle(page)
  assert.equal(await page.locator('[data-axes]').isVisible(), true)
  const sheet = await page.evaluate(() => { const a = [...document.querySelectorAll('.axis-km')]; return { left: parseFloat(a[0].style.left), right: parseFloat(a.at(-1).style.left) } })
  const plot = await page.locator('[data-plot]').boundingBox(), scene = await page.locator('[data-scene]').boundingBox()
  assert.ok(Math.abs(scene.x + sheet.left - (plot.x + 36)) < 3, 'sheet start aligns with profile axis')
  await page.mouse.click(box.x + 36 + (box.width - 54) * 0.53, box.y + box.height / 2 + 14)
  assert.equal(await mode(page), 'section')
  const picked = Number(await selected(page)); assert.ok(picked > 600 && picked < 660, `picked ${picked}`)
  await settle(page)
  assert.equal(await page.evaluate(() => window.wallDiagnostics.stats().cut < 1), true)
  results.push(`mouse chain route (click selected ${routeClick}) -> unroll -> click spot -> section ${picked} passed; sheet aligned with profile`)
  const sorted = frames.slice(1).sort((a, b) => a - b)
  results.push(`unroll transition frames: ${frames.length}, median ${sorted[Math.floor(sorted.length / 2)]?.toFixed(1)} ms, p95 ${sorted[Math.floor(sorted.length * 0.95)]?.toFixed(1)} ms (headless SwiftShader, not a hardware GPU measurement)`)

  await page.locator('[data-cam] [aria-checked="true"]').focus(); await page.keyboard.press('ArrowLeft'); assert.equal(await mode(page), 'unroll')
  await page.keyboard.press('ArrowLeft'); assert.equal(await mode(page), 'route')
  await strip.focus(); await page.keyboard.press('2'); assert.equal(await mode(page), 'unroll'); await page.keyboard.press('3'); assert.equal(await mode(page), 'section')
  const kept = await selected(page); await page.keyboard.press('1'); assert.equal(await selected(page), kept)
  results.push('keyboard chain via camera keys and 1/2/3 passed, selection kept across scales')

  const before = await selected(page); await page.locator('[data-theme-toggle]').click(); assert.equal(await selected(page), before)
  await page.getByRole('radio', { name: 'Труба 2' }).click(); assert.equal(await selected(page), '0')
  await page.locator('#distance').fill('8375'); await page.locator('#distance').press('Enter'); assert.equal(await selected(page), '837')
  await page.locator('[data-priority]').click(); assert.equal(await page.locator('[data-segment]').count(), 84)
  await page.locator('[data-segment]').first().click(); assert.equal(await page.locator('[data-segment]').first().getAttribute('aria-pressed'), 'true')
  results.push('theme keeps selection; case 2 partial segment and priority list passed')

  await page.evaluate(() => document.querySelector('[data-scene] canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
  await page.waitForFunction(() => document.querySelector('[data-scene]').dataset.renderer === 'fallback')
  results.push('real WebGL context loss switches to 2D scheme')

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const rp = await reduced.newPage(); watch(rp)
  await rp.goto(`${base}screen-pipe.html`); await ready(rp)
  await rp.waitForFunction(() => document.querySelector('[data-scene]').dataset.renderer === 'ready')
  await rp.keyboard.press('2')
  const instant = await rp.evaluate(() => window.wallDiagnostics.stats())
  assert.equal(instant.unroll, 1); assert.equal(instant.moving, false)
  results.push('reduced motion: unroll is flat immediately')

  const np = await context.newPage(); watch(np)
  await np.goto(`${base}screen-pipe.html?state=nogl`); await ready(np)
  assert.equal(await np.locator('[data-scene]').getAttribute('data-renderer'), 'fallback')
  for (const key of ['1', '2', '3']) { await np.keyboard.press(key); assert.ok(await np.locator('[data-fallback] svg').count() >= 1) }
  await np.keyboard.press('2')
  const flat = await np.locator('[data-fallback] svg').boundingBox()
  await np.mouse.click(flat.x + 36 * flat.width / 800 + (flat.width - 54 * flat.width / 800) * 0.25, flat.y + flat.height * 0.4)
  assert.equal(await mode(np), 'section')
  results.push('forced 2D: three scales render as SVG, sheet click cuts the pipe')

  const mp = await context.newPage(); watch(mp)
  await mp.route('**/wall/renderer.js', (r) => r.abort())
  await mp.goto(`${base}screen-pipe.html`); await ready(mp)
  await mp.waitForFunction(() => document.querySelector('[data-scene]').dataset.renderer === 'fallback', null, { timeout: 9000 })
  results.push('absent renderer module falls back to 2D after timeout')
  errors.splice(0, errors.length, ...errors.filter((e) => !e.includes('renderer.js')))

  for (const state of ['loading', 'empty', 'error', 'missing']) {
    await np.goto(`${base}screen-pipe.html?state=${state}`); await ready(np)
    if (state === 'missing') assert.equal(await np.locator('[data-observed-legend]').isVisible(), false)
    else { assert.equal(await np.locator('[data-state-panel]').isVisible(), true); await np.locator('[data-recover]').click(); assert.equal(await np.locator('[data-content]').isVisible(), true) }
  }
  results.push('loading, empty, error recover; missing hides observed legend')

  const matrix = []
  for (const [w, h] of [[375, 800], [768, 1000], [1440, 900]]) for (const theme of ['dark', 'light']) for (const file of ['screen-pipe.html', 'pipe-kit.html']) {
    const c = await browser.newContext({ viewport: { width: w, height: h } })
    await c.addInitScript((t) => { try { localStorage.setItem('ds-theme', t) } catch {} }, theme)
    const p = await c.newPage(); watch(p)
    await p.goto(`${base}${file}`); await ready(p); await p.waitForTimeout(600)
    const modes = file === 'screen-pipe.html' ? ['route', 'unroll', 'section'] : ['page']
    for (const m of modes) {
      if (m !== 'page') { await p.evaluate((x) => window.wallDiagnostics.setMode(x), m); await p.waitForTimeout(1500) }
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      const axe = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      const name = `${file.replace('.html', '')}-${m}-${w}-${theme}.png`
      await p.screenshot({ path: resolve(out, name), fullPage: m === 'page' }).catch((e) => results.push(`screenshot ${name} skipped: ${e.message.split('\n')[0]}`))
      matrix.push({ file, mode: m, width: w, theme, overflow, violations: axe.violations.map((v) => `${v.id}:${v.nodes.length}`) })
    }
    await c.close()
  }
  writeFileSync(resolve(out, 'matrix.json'), JSON.stringify(matrix, null, 2))
  const bad = matrix.filter((r) => r.overflow > 0 || r.violations.length)
  results.push(`matrix ${matrix.length} views (375/768/1440, both themes): ${bad.length ? `FAILED ${JSON.stringify(bad)}` : 'no overflow, no axe violations'}`)
  assert.equal(bad.length, 0)
  assert.deepEqual(errors, [])
  results.push('no page errors')
} finally {
  writeFileSync(resolve(out, 'results.txt'), results.join('\n') + (errors.length ? `\nERRORS\n${errors.join('\n')}` : '') + '\n')
  console.log(results.join('\n')); if (errors.length) console.log('ERRORS', errors)
  await browser.close()
}
