import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const require=createRequire(new URL('../../../../../frontend/package.json',import.meta.url))
const {chromium}=require('playwright')
const AxeBuilder=require('@axe-core/playwright').default
const base='http://127.0.0.1:5178/work/design/ds/'
const out=resolve('work/audits/scanner')
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true})
const errors=[],results=[]
const context=await browser.newContext({viewport:{width:1440,height:900}})
const page=await context.newPage()
page.on('pageerror',(error)=>errors.push(error.message))
const open=async(query='')=>{await page.goto(`${base}screen-thickness.html${query}`);await page.waitForSelector('html[data-ready]')}
const selected=()=>page.locator('#main').getAttribute('data-selected-segment')
try {
  await open()
  await page.waitForFunction(()=>document.querySelector('[data-scene]').dataset.renderer==='ready')
  assert.equal(await selected(),'630')
  await page.waitForFunction(()=>window.scannerDiagnostics.stats().selected===630)
  await page.locator('#segment-range').focus();await page.keyboard.press('ArrowRight');assert.equal(await selected(),'631')
  await page.keyboard.press('Home');assert.equal(await selected(),'0')
  await page.keyboard.press('End');assert.equal(await selected(),'1199')
  await page.locator('#distance').fill('10');await page.locator('#distance').press('Enter');assert.equal(await selected(),'1')
  await page.locator('#distance').fill('bad');await page.locator('#distance').press('Enter');assert.equal(await selected(),'1');assert.equal(await page.locator('#distance').getAttribute('aria-invalid'),'true')
  await page.getByRole('radio',{name:'Труба 2'}).click();assert.equal(await selected(),'0')
  await page.locator('#distance').fill('8375');await page.locator('#distance').press('Enter');assert.equal(await selected(),'837')
  assert.match(await page.locator('[data-position]').textContent(),/8\s?370–8\s?375/)
  assert.equal(await page.locator('[data-observed-legend]').isVisible(),false)
  await page.locator('[data-priority]').click();assert.equal(await page.locator('[data-segment]').count(),84)
  const first=page.locator('[data-segment]').first();await first.focus();await page.keyboard.press('Enter')
  assert.equal(await first.getAttribute('aria-pressed'),'true');assert.equal(await first.evaluate((el)=>el===document.activeElement),true)
  const before=await selected();await page.locator('[data-theme-toggle]').click();assert.equal(await selected(),before)
  await page.locator('[data-evidence-toggle]').click();assert.equal(await page.locator('#evidence-panel').isVisible(),true)
  results.push('selection: range, keyboard, coordinate validation, partial segment, priority focus, case and theme passed')
  await open()
  const plot=await page.locator('[data-plot]').boundingBox()
  await page.mouse.click(plot.x+36+(plot.width-54)*0.25,plot.y+80)
  assert.ok(Math.abs(Number(await selected())-300)<2)
  await page.mouse.move(plot.x+50,plot.y+80);await page.mouse.down();await page.mouse.move(plot.x+plot.width-25,plot.y+80,{steps:8});await page.mouse.up()
  assert.ok(Number(await selected())>1100)
  const scene=await page.locator('[data-scene] canvas').boundingBox()
  await page.mouse.click(scene.x+scene.width*0.3,scene.y+scene.height*0.5)
  results.push(`plot click and drag passed; scene selection ${await selected()}`)
  await page.evaluate(()=>{const c=document.querySelector('canvas');c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()})
  await page.waitForFunction(()=>document.querySelector('[data-scene]').dataset.renderer==='fallback')
  await page.locator('#segment-range').focus();await page.keyboard.press('Home');assert.equal(await selected(),'0')
  results.push('real WebGL context loss: fallback and selection passed')
  for(const state of ['loading','empty','error']){
    await open(`?state=${state}`);assert.equal(await page.locator('[data-content]').isVisible(),false)
    await page.locator('[data-recover]').click();assert.equal(await page.locator('[data-content]').isVisible(),true)
    assert.equal(await page.locator('#segment-range').evaluate((el)=>el===document.activeElement),true)
  }
  await open('?state=missing');assert.match(await page.locator('[data-facts]').textContent(),/Нет данных/);assert.equal(await page.locator('.plot-observed').getAttribute('d'),'')
  await open('?state=nogl');assert.equal(await page.locator('[data-scene]').getAttribute('data-renderer'),'fallback')
  const fallback=await page.locator('[data-fallback]').boundingBox();await page.mouse.click(fallback.x+fallback.width/2,fallback.y+fallback.height/2);assert.ok(Math.abs(Number(await selected())-600)<2)
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#segment-range').focus();await page.keyboard.press('ArrowLeft');assert.ok(Number(await selected())<601)
  results.push('loading/empty/error recovery, absent data, 2D selection, reduced motion passed')
  for(const theme of ['dark','light']) for(const width of [375,1280,1440]){
    await page.setViewportSize({width,height:900})
    await page.evaluate((t)=>localStorage.setItem('ds-theme',t),theme)
    await open();await page.waitForFunction(()=>document.querySelector('[data-scene]').dataset.renderer==='ready')
    await page.evaluate(()=>document.fonts.ready)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width} ${theme}`)
    if(width>=1280){const box=await page.locator('[data-plot]').boundingBox();assert.ok(box.y+box.height<=900,`profile outside viewport ${width}: ${box.y+box.height}`)}
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
    if(axe.violations.length)writeFileSync(`${out}/axe-${width}-${theme}.json`,JSON.stringify(axe.violations,null,2))
    assert.deepEqual(axe.violations.map((v)=>({id:v.id,nodes:v.nodes.map((n)=>n.target)})),[],`axe ${width} ${theme}`)
    await page.screenshot({path:`${out}/scanner-${width}-${theme}.png`,fullPage:true})
    results.push(`scanner ${width} ${theme}: axe and overflow passed`)
  }
  for(const file of ['scanner/catalog.html','scanner/blueprints.html','kit.html','index.html']){
    for(const width of [375,1440]) for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:900});await page.evaluate((t)=>localStorage.setItem('ds-theme',t),theme)
      await page.goto(base+file);await page.evaluate(()=>document.fonts.ready)
      if(file==='kit.html')await page.waitForSelector('html[data-ready]')
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${file} ${width}`)
      if(file.startsWith('scanner/')){const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[],`axe ${file} ${width} ${theme}`)}
      await page.screenshot({path:`${out}/${file.replaceAll('/','-').replace('.html','')}-${width}-${theme}.png`,fullPage:true})
    }
    results.push(`${file}: theme and width matrix passed`)
  }
  await page.setViewportSize({width:1440,height:900});await open()
  await page.waitForFunction(()=>document.querySelector('[data-scene]').dataset.renderer==='ready')
  const stats=await page.evaluate(async()=>{
    const input=document.querySelector('#segment-range'),intervals=[]
    for(let i=0;i<10;i++)await new Promise(requestAnimationFrame)
    let last=performance.now()
    for(let i=0;i<90;i++){input.value=400+i*3;input.dispatchEvent(new Event('input'));const now=await new Promise(requestAnimationFrame);intervals.push(now-last);last=now}
    intervals.sort((a,b)=>a-b)
    return {...window.scannerDiagnostics.stats(),frameSamples:90,frameP95Ms:intervals[Math.floor(intervals.length*0.95)],date:new Date().toISOString()}
  })
  writeFileSync(`${out}/performance.json`,JSON.stringify({viewport:'1440x900',browser:browser.version(),mode:'headless Chromium, deviceScaleFactor 1, 90 pointer-equivalent selections',...stats},null,2))
  await page.route('**/scanner/renderer.js',route=>route.abort())
  await open();assert.equal(await page.locator('[data-scene]').getAttribute('data-renderer'),'fallback')
  await page.locator('#segment-range').focus();await page.keyboard.press('Home');assert.equal(await selected(),'0')
  results.push('renderer module unavailable: UI and selection remain usable')
  assert.deepEqual(errors,[])
  writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2))
  console.log(results.join('\n'))
} finally { await browser.close() }
