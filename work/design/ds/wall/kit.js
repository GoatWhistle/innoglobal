import { readTheme } from '../kit-theme.js'
import { makeExample } from '../scanner/data.js'
import { icon, number } from '../scanner/format.js'
import { dimension, sectionDrawing, stamp } from './drawing.js'
import { lossHour, picket } from './field.js'
import { sheetImage } from './flat.js'
import { createWallStore } from './state.js'
import { mountStrip } from './strip.js'

const q = (s) => document.querySelector(s)
const one = makeExample(1), two = makeExample(2), missing = makeExample(1, 'missing')
const thinnest = (p) => p.segments.reduce((a, b) => (b.predictedMm < a.predictedMm ? b : a))

q('[data-markings]').innerHTML = [
  ['marking-title', `<span>Ø530×8</span><span>ТРУБА 1</span><span>${picket(6300)}</span>`, 'Заголовок экрана'],
  ['', `<span>Ø325×6</span><span>ТРУБА 2</span><span>${picket(8370)}</span>`, 'Подпись, труба 2, последний сегмент'],
  ['marking-title', '<span>Ø530×8</span><span>ТРУБА 1</span><span>ПК —</span>', 'Сегмент не выбран'],
].map(([cls, html, caption]) => `<figure><p class="marking ${cls}">${html}</p><figcaption>${caption}</figcaption></figure>`).join('')

const arrowRight = dimension({ x1: 30, y1: 70, x2: 250, y2: 70, offset: -30, label: '530' })
const vertical = dimension({ x1: 60, y1: 20, x2: 60, y2: 120, offset: -26, label: '8,00' })
const angled = dimension({ x1: 40, y1: 120, x2: 230, y2: 30, offset: -20, label: '210 м' })
q('[data-dimensions]').innerHTML = [
  [`<rect class="draw-contour" x="30" y="70" width="220" height="50"/>${arrowRight}`, 'Горизонтальная: диаметр'],
  [`<rect class="draw-contour" x="60" y="20" width="160" height="100"/>${vertical}`, 'Вертикальная: стенка'],
  [`<path class="draw-contour" d="M40 120L230 30"/>${angled}`, 'Наклонная: текст идёт по линии'],
].map(([svg, caption]) => `<figure><svg class="pk-dim" viewBox="0 0 280 150" role="img" aria-label="${caption}">${svg}</svg><figcaption>${caption}</figcaption></figure>`).join('')

function sheets() {
  const a = one.segments[630], b = thinnest(two), c = missing.segments[100]
  q('[data-sheets]').innerHTML = [
    [one, a, lossHour(one, a), 'Труба 1, сегмент 630: самое тонкое место'],
    [two, b, 3, 'Труба 2, выбранная точка на 3:00'],
    [missing, c, lossHour(missing, c), 'Нет замера ВТД и интервала'],
  ].map(([p, s, h, caption], i) => `<figure class="drawing-sheet pk-sheet">${sectionDrawing(p, s, h, { id: `kit-${i}` })}<figcaption>${caption}</figcaption>${stamp(p, s, { sheet: 'Сечение, 3 из 3' })}</figure>`).join('')
  q('[data-matte-stage]').style.setProperty('--matte-image', `url("${sheetImage(one)}")`)
}

const strips = []
for (const host of document.querySelectorAll('[data-kit-strip]')) {
  const kind = host.dataset.kitStrip, store = createWallStore(kind.startsWith('2') ? 2 : 1)
  if (kind === '2') store.select(837)
  if (kind.endsWith('p')) store.togglePriority()
  const strip = mountStrip(host, store)
  store.subscribe((state) => strip.update(state))
  strips.push(strip)
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('ds-theme', theme) } catch {}
  const toggle = q('[data-theme-toggle]')
  toggle.innerHTML = `${icon(theme === 'dark' ? 'sun' : 'moon')}<span>${theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>`
  toggle.setAttribute('aria-label', `Включить ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`)
  document.dispatchEvent(new Event('theme:change'))
  sheets()
}
q('[data-theme-toggle]').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'))
setTheme(readTheme())
window.wallKitDiagnostics = { strips: strips.length, nominal: number(one.nominalMm) }
document.documentElement.dataset.ready = ''
