import { chromium } from '../../../frontend/node_modules/playwright/index.mjs';
const browser = await chromium.launch(); const context = await browser.newContext(); const page = await context.newPage();
await page.goto('http://localhost:18080/pipes/1250022871?segment=130');
const chart=page.getByRole('slider'); await chart.waitFor(); await chart.scrollIntoViewIfNeeded(); const box=await chart.locator('rect').last().boundingBox();
await page.mouse.move(box.x+box.width*.2,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5,{steps:10});await page.mouse.up();await page.waitForURL(/from=/);await page.getByRole('button',{name:'Весь участок',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('from'));
await page.goto('http://localhost:18080/pipes/1250022871/priorities');await page.getByRole('table').waitFor();await page.getByRole('button',{name:/Прогноз, мм/}).click();if(await page.locator('th[aria-sort="ascending"]').count()!==1)throw Error('sort failed');
await page.getByRole('button',{name:/Диапазон/}).click();await page.getByRole('option',{name:'0–1 км',exact:true}).click(); const rows=await page.locator('tbody tr').count();if(rows===0||rows>=53)throw Error('filter failed');
console.log(JSON.stringify({zoomReset:true,sorting:true,kilometerFilterRows:rows}));await browser.close();
