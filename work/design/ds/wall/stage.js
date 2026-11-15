import { number } from '../scanner/format.js'
import { clock, picket, wallAt } from './field.js'
import { sectionDrawing } from './drawing.js'
import { flatRoute, flatSheet } from './flat.js'

const WIDE = '(min-width: 64rem)'

export function mountStage(host, store) {
  const canvas = host.querySelector('canvas'), fallback = host.querySelector('[data-fallback]')
  const tags = host.querySelector('[data-tags]'), axes = host.querySelector('[data-axes]'), status = host.querySelector('[data-render-state]')
  let engine = null, current = null, failed = false, lastMode = null
  const wide = matchMedia(WIDE)
  const fail = (reason = 'forced') => {
    failed = true; host.dataset.renderer = 'fallback'; host.dataset.reason = reason
    status.textContent = '2D-схема без WebGL. Все масштабы доступны.'
    engine?.dispose(); engine = null; renderFallback(store.snapshot())
  }
  function renderFallback(state) {
    if (!failed || !state.segment) return
    const width = Math.max(320, host.clientWidth)
    fallback.innerHTML = state.mode === 'route' ? flatRoute(state.pipeline, state.segment, width)
      : state.mode === 'unroll' ? flatSheet(state.pipeline, state.segment, state.hour, width)
      : `<div class="flat-section">${sectionDrawing(state.pipeline, state.segment, state.hour, { id: 'flat-cut', compact: true })}</div>`
  }
  const readout = host.querySelector('[data-readout]')
  function blocked(pt) {
    const a = readout.getBoundingClientRect(), b = host.getBoundingClientRect()
    return pt.x > a.left - b.left - 48 && pt.x < a.right - b.left + 48 && pt.y > a.top - b.top - 8 && pt.y < a.bottom - b.top + 40
  }
  function placeTags(view) {
    if (!view) return
    const state = store.snapshot(), { pipeline: p, segment: s } = state
    if (!s) return
    host.dataset.unroll = view.unroll > 0.98 ? 'flat' : view.unroll > 0.02 ? 'moving' : 'round'
    const items = []
    if (view.mode === 'route' && !view.moving) {
      const step = p.lengthM > 9000 ? 2000 : 2000
      for (let m = 0; m <= p.lengthM; m += step) {
        const pt = view.point(12, m / p.lengthM)
        if (blocked(pt) || Math.abs(pt.x - view.point(12).x) < 90) continue
        items.push(`<span class="tag tag-picket" style="transform:translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px)"><span class="marking">${picket(m)}</span></span>`)
      }
    }
    const mm = wallAt(p, s, state.hour)
    const pt = view.mode === 'section' ? view.capPoint(state.hour, mm) : view.point(view.mode === 'route' ? 12 : state.hour)
    if (!view.moving) {
      const text = view.mode === 'route' ? `${s.id} · ${number(s.predictedMm, 2)} мм` : `${number(mm, 2)} мм · ${clock(state.hour)}`
      items.push(`<span class="tag tag-selected" data-side="${pt.x > host.clientWidth * 0.66 ? 'left' : 'right'}" style="transform:translate(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px)"><span class="tag-clamp"></span><span class="tag-text">${text}</span></span>`)
    }
    tags.innerHTML = items.join('')
    if (view.sheet && view.unroll > 0.98) {
      const [a, b] = view.sheet, left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y)
      const hours = [12, 9, 6, 3, 0].map((h, i) => `<span class="axis-hour" style="top:${top + (bottom - top) * i / 4}px;left:${left}px">${h || 12}</span>`).join('')
      const km = Array.from({ length: Math.floor(p.lengthM / 1000) + 1 }, (_, i) => i).filter((i, _, list) => list.length < 8 || i % 2 === 0)
      const last = km[km.length - 1]
      const labels = km.map((k) => `<span class="axis-km${k === last ? ' axis-km-end' : ''}" style="left:${left + (right - left) * k * 1000 / p.lengthM}px;top:${bottom}px">${k === last ? `${k} км` : k}</span>`).join('')
      axes.innerHTML = `${hours}${labels}`
      axes.hidden = false
    } else axes.hidden = true
    lastMode = view.mode
  }
  function attach(factory) {
    if (engine || failed) return
    try {
      if (new URLSearchParams(location.search).get('state') === 'nogl') { fail('forced'); return }
      engine = factory(canvas, {
        onPick: ({ meters, hour }) => { const cut = store.snapshot().mode === 'unroll'; store.at(meters, hour); if (cut) store.setMode('section') },
        onFrame: placeTags,
        onFailure: (reason) => fail(reason),
      })
    } catch (error) { fail(error.message); return }
    const state = store.snapshot()
    engine.setTheme(document.documentElement.dataset.theme)
    engine.setData(state.pipeline); current = state.pipeline
    engine.select(state.selected, true); engine.setMode(state.mode, true)
    resize()
    host.dataset.renderer = 'ready'; status.textContent = 'Продольный масштаб условный'
  }
  const resize = () => { engine?.resize(host.clientWidth, host.clientHeight, wide.matches); renderFallback(store.snapshot()) }
  const observer = new ResizeObserver(resize); observer.observe(host)
  const theme = () => { engine?.setTheme(document.documentElement.dataset.theme); renderFallback(store.snapshot()) }
  document.addEventListener('theme:change', theme)
  const unsubscribe = store.subscribe((state) => {
    host.dataset.mode = state.mode
    if (!state.segment) return
    if (engine) {
      if (current !== state.pipeline) { current = state.pipeline; engine.setData(state.pipeline) }
      engine.select(state.selected); engine.setMode(state.mode)
      if (lastMode === state.mode) placeTags(engine.state())
    }
    renderFallback(state)
  })
  fallback.addEventListener('click', (event) => {
    const state = store.snapshot(), r = fallback.getBoundingClientRect(), svg = fallback.querySelector('svg')
    if (!svg || state.mode === 'section') return
    const box = svg.viewBox.baseVal, k = box.width / r.width, x = (event.clientX - r.left) * k
    const inner = box.width - 54
    const meters = (x - 36) / inner * state.pipeline.lengthM
    if (state.mode === 'unroll') {
      const y = (event.clientY - r.top) * (box.height / r.height), height = Math.round(inner / 4.55)
      store.at(meters, Math.max(0, Math.min(12, 12 - (y - 24) / height * 12)) % 12); store.setMode('section')
    } else store.at(meters)
  })
  const ready = (event) => attach(event.detail)
  document.addEventListener('wall:renderer-ready', ready, { once: true })
  if (window.wallEngineFactory) attach(window.wallEngineFactory)
  const timer = setTimeout(() => { if (!engine && !failed) fail('module') }, 6000)
  return {
    stats: () => engine?.stats() ?? { mode: store.snapshot().mode, fallback: true },
    fail,
    dispose() { clearTimeout(timer); document.removeEventListener('wall:renderer-ready', ready); unsubscribe(); observer.disconnect(); document.removeEventListener('theme:change', theme); engine?.dispose() },
  }
}
