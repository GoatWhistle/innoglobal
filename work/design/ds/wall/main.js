import { segmented } from '../kit-controls.js'
import { readTheme } from '../kit-theme.js'
import { icon, number } from '../scanner/format.js'
import { bindPlot, renderPlot } from '../scanner/plot.js'
import { mountStage } from './stage.js'
import { createWallStore, MODES } from './state.js'
import { mountStrip } from './strip.js'
import { createView } from './view.js'

const params = new URLSearchParams(location.search)
const requested = params.get('state') ?? 'ready', asMode = MODES.includes(requested)
const store = createWallStore(params.get('case') === '2' ? 2 : 1, asMode ? 'ready' : requested, asMode ? requested : params.get('mode') ?? 'route')
const root = document.querySelector('#main'), q = (s) => document.querySelector(s)
const pipelines = q('[data-pipelines]')
for (const b of pipelines.querySelectorAll('[role="radio"]')) b.setAttribute('aria-checked', String(Number(b.dataset.value) === store.snapshot().pipeline.caseId))
segmented(pipelines)
pipelines.addEventListener('change', (e) => { if (Number(e.detail) !== store.snapshot().pipeline.caseId) store.switchCase(Number(e.detail)) })

const cam = q('[data-cam]'), keys = [...cam.querySelectorAll('[role="radio"]')]
const syncKeys = (mode) => { for (const k of keys) { k.setAttribute('aria-checked', String(k.dataset.value === mode)); k.tabIndex = k.dataset.value === mode ? 0 : -1 } }
for (const k of keys) k.addEventListener('click', () => store.setMode(k.dataset.value))
cam.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (step === undefined) return
  e.preventDefault()
  const next = keys[(MODES.indexOf(store.snapshot().mode) + step + keys.length) % keys.length]
  store.setMode(next.dataset.value); next.focus()
})

const stage = mountStage(q('[data-scene]'), store)
const strip = mountStrip(q('[data-strip]'), store)
const view = createView(root, store)
store.subscribe((state) => { view(state); strip.update(state); syncKeys(state.mode) })
bindPlot(q('[data-plot]'), store)
q('[data-prev]').addEventListener('click', () => store.select(store.snapshot().selected - 1))
q('[data-next]').addEventListener('click', () => store.select(store.snapshot().selected + 1))
q('[data-priority]').addEventListener('click', () => store.togglePriority())
q('[data-recover]').addEventListener('click', () => { store.recover(); q('[data-strip]').focus() })
q('[data-priority-list]').addEventListener('click', (e) => { const b = e.target.closest('[data-segment]'); if (b) store.select(Number(b.dataset.segment)) })
q('[data-evidence-toggle]').addEventListener('click', (e) => { const b = e.currentTarget, panel = q('#evidence-panel'); panel.hidden = !panel.hidden; b.setAttribute('aria-expanded', String(!panel.hidden)) })
q('[data-coordinate]').addEventListener('submit', (event) => {
  event.preventDefault()
  const field = q('#distance'), raw = field.value.trim().replace(/\s/g, ''), meters = Number(raw.replace(',', '.')), length = store.snapshot().pipeline.lengthM
  if (!raw || !Number.isFinite(meters) || meters < 0 || meters > length) { field.setAttribute('aria-invalid', 'true'); q('#distance-error').textContent = `Введите расстояние от 0 до ${number(length)} м.`; field.focus(); return }
  store.at(meters)
})
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input, textarea, [contenteditable]')) return
  const mode = { 1: 'route', 2: 'unroll', 3: 'section' }[e.key]
  if (mode) store.setMode(mode)
})

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('ds-theme', theme) } catch {}
  const toggle = q('[data-theme-toggle]')
  toggle.innerHTML = `${icon(theme === 'dark' ? 'sun' : 'moon')}<span>${theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>`
  toggle.setAttribute('aria-label', `Включить ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`)
  document.dispatchEvent(new Event('theme:change'))
  view(store.snapshot())
}
q('[data-theme-toggle]').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'))
setTheme(readTheme())
const observer = new ResizeObserver(() => renderPlot(q('[data-plot]'), store.snapshot())); observer.observe(q('[data-plot]'))
window.wallDiagnostics = { snapshot: store.snapshot, stats: stage.stats, setMode: (m) => store.setMode(m) }
addEventListener('pagehide', () => { stage.dispose(); strip.dispose(); observer.disconnect() }, { once: true })
document.documentElement.dataset.ready = ''
