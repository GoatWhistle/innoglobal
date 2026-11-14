import { number } from './format.js'

export function renderPlot(host, state) {
  const { pipeline: p, segment: s, priorities, priority } = state
  if (!s) { host.innerHTML = ''; return }
  const width = Math.max(300, host.clientWidth), height = 180, left = 36, right = width - 18
  const x = (m) => left + m / p.lengthM * (right - left)
  const y = (mm) => 142 - mm / p.nominalMm * 116
  const points = p.segments
  const path = (field) => {
    let pen = false
    return points.map((v) => {
      if (!Number.isFinite(v[field])) { pen = false; return '' }
      const start = pen ? 'L' : 'M'; pen = true
      return `${start}${x((v.startM + v.endM) / 2).toFixed(2)},${y(v[field]).toFixed(2)}`
    }).join('')
  }
  const bands = []
  let run = []
  const flush = () => {
    if (run.length) bands.push('M' + run.map((v) => `${x(v.startM)},${y(v.p10Mm)}`).join('L') + 'L' + [...run].reverse().map((v) => `${x(v.endM)},${y(v.p90Mm)}`).join('L') + 'Z')
    run = []
  }
  for (const v of points) {
    if (Number.isFinite(v.p10Mm) && Number.isFinite(v.p90Mm)) run.push(v)
    else flush()
  }
  flush()
  const marks = priority ? points.filter((v) => priorities.has(v.id)).map((v) => `<rect x="${x(v.startM)}" y="148" width="${Math.max(1, x(v.endM)-x(v.startM))}" height="4" class="plot-priority"/>`).join('') : ''
  const sx = x((s.startM+s.endM)/2), sy = y(s.predictedMm)
  host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
${[0,p.nominalMm/2,p.nominalMm].map((v) => `<path d="M${left} ${y(v)}H${right}" class="plot-grid"/><text x="${left-8}" y="${y(v)+4}" text-anchor="end">${number(v)}</text>`).join('')}
<text x="${left}" y="14">мм</text><path d="${bands.join('')}" class="plot-band"/>
<path d="${path('observedMm')}" class="plot-observed"/><path d="${path('predictedMm')}" class="plot-forecast"/>
${marks}<path d="M${sx} 22V151" class="plot-cursor"/><circle cx="${sx}" cy="${sy}" r="4" class="plot-point"/>
${[0,p.lengthM/2,p.lengthM].map((m, i) => `<text x="${x(m)}" y="174" text-anchor="${i===0?'start':i===2?'end':'middle'}">${number(m)}${i===2?' м':''}</text>`).join('')}</svg>`
}

export function bindPlot(host, store) {
  const choose = (event) => {
    const r = host.getBoundingClientRect()
    store.at((event.clientX-r.left-36)/(r.width-54)*store.snapshot().pipeline.lengthM)
  }
  let dragging = false
  host.addEventListener('pointerdown', (e) => { dragging = true; host.setPointerCapture(e.pointerId); choose(e) })
  host.addEventListener('pointermove', (e) => { if (dragging) choose(e) })
  for (const type of ['pointerup','pointercancel','lostpointercapture']) host.addEventListener(type, () => { dragging = false })
}
