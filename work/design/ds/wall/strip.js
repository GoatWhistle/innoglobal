import { number, range } from '../scanner/format.js'
import { relative, thinnest } from './field.js'
import { css, shade, wallStops } from './scale.js'
import { SHEET } from './metrics.js'

export function mountStrip(host, store) {
  host.innerHTML = `<canvas aria-hidden="true"></canvas><span class="strip-thumb" aria-hidden="true"></span><div class="strip-ruler" aria-hidden="true"></div>`
  const canvas = host.querySelector('canvas'), thumb = host.querySelector('.strip-thumb'), ruler = host.querySelector('.strip-ruler')
  let drawn = null
  const inner = () => Math.max(1, host.clientWidth - SHEET.left - SHEET.right)
  function paint(state) {
    const { pipeline: p, priorities, priority } = state
    const w = host.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio, 2)
    const key = `${p.id}:${w}:${h}:${priority}:${document.documentElement.dataset.theme}`
    if (drawn === key) return
    drawn = key
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d'), stops = wallStops(), floor = thinnest(p), span = inner()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
    const step = span / p.segments.length
    for (const s of p.segments) {
      const v = relative(p, s.predictedMm, floor), x = SHEET.left + s.startM / p.lengthM * span
      const tall = (h - 10) * (0.28 + 0.72 * v)
      ctx.fillStyle = css(shade(stops, v)); ctx.fillRect(x, h - 8 - tall, Math.max(0.6, step * 0.82), tall)
      if (priority && priorities.has(s.id)) { ctx.fillStyle = getComputedStyle(host).getPropertyValue('--text-warning'); ctx.fillRect(x, h - 4, Math.max(1, step), 4) }
    }
    const marks = p.lengthM > 9000 ? [0, 3000, 6000, 9000, 12000] : [0, 2000, 4000, 6000, 8000, p.lengthM]
    ruler.innerHTML = marks.filter((m) => m === p.lengthM || (m <= p.lengthM && p.lengthM - m > p.lengthM * 0.08)).map((m) => `<span style="left:${SHEET.left + m / p.lengthM * span}px">${number(m / 1000, m % 1000 ? 3 : 0)}${m === marks.at(-1) ? ' км' : ''}</span>`).join('')
  }
  function update(state) {
    const { pipeline: p, segment: s, selected } = state
    if (!s) return
    paint(state)
    thumb.style.transform = `translateX(${SHEET.left + (s.startM + s.endM) / 2 / p.lengthM * inner()}px)`
    host.setAttribute('aria-valuemin', 0); host.setAttribute('aria-valuemax', p.segments.length - 1); host.setAttribute('aria-valuenow', selected)
    host.setAttribute('aria-valuetext', `Сегмент ${selected}, ${range(s)}, ${number(s.predictedMm, 2)} мм`)
  }
  const choose = (event) => {
    const r = host.getBoundingClientRect(), p = store.snapshot().pipeline
    store.at((event.clientX - r.left - SHEET.left) / inner() * p.lengthM)
  }
  let dragging = false
  host.addEventListener('pointerdown', (e) => { dragging = true; host.setPointerCapture(e.pointerId); host.focus(); choose(e) })
  host.addEventListener('pointermove', (e) => { if (dragging) choose(e) })
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(type, () => { dragging = false })
  host.addEventListener('keydown', (e) => {
    const { selected, pipeline } = store.snapshot()
    const next = { ArrowRight: selected + 1, ArrowUp: selected + 1, ArrowLeft: selected - 1, ArrowDown: selected - 1, PageUp: selected + 10, PageDown: selected - 10, Home: 0, End: pipeline.segments.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault(); store.select(next)
  })
  const observer = new ResizeObserver(() => { drawn = null; update(store.snapshot()) })
  observer.observe(host)
  document.addEventListener('theme:change', () => { drawn = null; update(store.snapshot()) })
  return { update, dispose: () => observer.disconnect() }
}
