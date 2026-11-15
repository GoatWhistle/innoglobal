import { date, escape, number, range } from '../scanner/format.js'
import { clock, ring } from './field.js'

const f = (n) => n.toFixed(1)

export function arrow(x, y, angle, size = 7) {
  const a = angle + Math.PI, s = 0.32
  return `M${f(x)} ${f(y)}L${f(x + Math.cos(a - s) * size)} ${f(y + Math.sin(a - s) * size)}L${f(x + Math.cos(a + s) * size)} ${f(y + Math.sin(a + s) * size)}Z`
}

export function dimension({ x1, y1, x2, y2, offset = 18, label, className = '' }) {
  const angle = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(angle) * offset, ny = Math.cos(angle) * offset
  const a = [x1 + nx, y1 + ny], b = [x2 + nx, y2 + ny], ext = Math.sign(offset) * 4
  const ex = -Math.sin(angle) * ext, ey = Math.cos(angle) * ext
  const mid = [(a[0] + b[0]) / 2 + nx * 0.28, (a[1] + b[1]) / 2 + ny * 0.28]
  const deg = ((angle * 180 / Math.PI) + 360) % 360, flip = deg > 90 && deg < 270 ? 180 : 0
  return `<g class="dim ${className}"><path class="dim-extension" d="M${f(x1)} ${f(y1)}L${f(a[0] + ex)} ${f(a[1] + ey)}M${f(x2)} ${f(y2)}L${f(b[0] + ex)} ${f(b[1] + ey)}"/>
<path class="dim-line" d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}"/><path class="dim-arrow" d="${arrow(a[0], a[1], angle + Math.PI)}${arrow(b[0], b[1], angle)}"/>
<text class="dim-text" x="${f(mid[0])}" y="${f(mid[1])}" text-anchor="middle" transform="rotate(${f(deg + flip)} ${f(mid[0])} ${f(mid[1])})">${escape(label)}</text></g>`
}

const polar = (cx, cy, r, hour) => { const a = hour / 12 * Math.PI * 2; return [cx + Math.sin(a) * r, cy - Math.cos(a) * r] }

export function sectionDrawing(pipeline, segment, hour, { id = 'cut', compact = false } = {}) {
  const cx = 160, cy = 168, outer = 108, scale = 34 / pipeline.nominalMm, count = 120
  const values = ring(pipeline, segment, count)
  const inner = values.map((mm, i) => polar(cx, cy, outer - mm * scale, i / count * 12))
  const innerPath = 'M' + inner.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z'
  const outerPath = `M${cx - outer} ${cy}a${outer} ${outer} 0 1 0 ${outer * 2} 0a${outer} ${outer} 0 1 0 ${-outer * 2} 0Z`
  const nominal = outer - pipeline.nominalMm * scale
  const at = Math.round(hour / 12 * count) % count, mm = values[at]
  const [ox, oy] = polar(cx, cy, outer, hour), [ix, iy] = polar(cx, cy, outer - mm * scale, hour)
  const [lx, ly] = polar(cx, cy, outer + 46, hour), [kx, ky] = polar(cx, cy, outer - mm * scale - 16, hour)
  const angle = Math.atan2(oy - iy, ox - ix), right = lx >= cx
  const shelf = right ? lx + 58 : lx - 58
  const ticks = [0, 3, 6, 9].map((h) => { const [x1, y1] = polar(cx, cy, outer + 6, h), [x2, y2] = polar(cx, cy, outer + 14, h), [tx, ty] = polar(cx, cy, outer + 26, h); return `<path class="draw-fine" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/><text class="draw-hour" x="${f(tx)}" y="${f(ty + 4)}" text-anchor="middle">${h || 12}</text>` }).join('')
  const label = `${number(mm, 2)} мм`
  return `<svg class="cut-drawing${compact ? ' is-compact' : ''}" viewBox="-40 -6 400 340" role="img" aria-label="Сечение сегмента ${segment.id}: наименьшая толщина ${number(segment.predictedMm, 2)} мм, отмеченная точка ${clock(hour)}, ${label}">
<defs><radialGradient id="${id}-metal" cx="0.32" cy="0.22" r="0.95"><stop offset="0" class="metal-a"/><stop offset="0.45" class="metal-b"/><stop offset="1" class="metal-c"/></radialGradient><pattern id="${id}-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5" class="draw-hatch"/></pattern></defs>
<path class="draw-axis" d="M${cx - outer - 20} ${cy}H${cx + outer + 20}M${cx} ${cy - outer - 20}V${cy + outer + 20}"/>
<path class="cut-metal" fill="url(#${id}-metal)" fill-rule="evenodd" d="${outerPath}${innerPath}"/><path class="cut-hatch" fill-rule="evenodd" fill="url(#${id}-hatch)" d="${outerPath}${innerPath}"/>
<path class="cut-oil" d="${innerPath}"/>
<circle class="draw-contour" cx="${cx}" cy="${cy}" r="${outer}"/><path class="draw-contour" d="${innerPath}"/>
<circle class="draw-nominal" cx="${cx}" cy="${cy}" r="${f(nominal)}"/>
${ticks}
${compact ? '' : dimension({ x1: cx - outer, y1: cy - outer, x2: cx + outer, y2: cy - outer, offset: -40, label: `Ø${number(pipeline.diameterMm)}` }).replace('<g class="dim ', '<g class="dim dim-diameter ')}
<g class="dim dim-wall"><path class="dim-line" d="M${f(kx)} ${f(ky)}L${f(lx)} ${f(ly)}L${f(shelf)} ${f(ly)}"/><path class="dim-arrow" d="${arrow(ix, iy, angle)}${arrow(ox, oy, angle + Math.PI)}"/>
<text class="dim-text dim-strong" x="${f(right ? lx + 4 : lx - 4)}" y="${f(ly - 7)}" text-anchor="${right ? 'start' : 'end'}">${label}</text>
<text class="dim-text dim-caption" x="${f(right ? lx + 4 : lx - 4)}" y="${f(ly + 15)}" text-anchor="${right ? 'start' : 'end'}">${clock(hour)}</text></g>
<circle class="draw-point" cx="${f(ix)}" cy="${f(iy)}" r="3"/>
</svg>`
}

export const wallFactor = (pipeline) => Math.round((34 / pipeline.nominalMm) / (108 / (pipeline.diameterMm / 2)))

export function stamp(pipeline, segment, { sheet = 'Сечение', scale = `Толщина ×${wallFactor(pipeline)}, условно` } = {}) {
  const rows = [
    ['Объект', `Труба ${pipeline.caseId}, Ø${number(pipeline.diameterMm)}×${number(pipeline.nominalMm)}`],
    ['Сегмент', segment ? `${segment.id}, ${range(segment)}` : 'Не выбран'],
    ['Прогноз на', date(pipeline.targetDate)],
    ['Масштаб', scale],
    ['Источник', pipeline.source === 'synthetic' ? 'Синтетический пример' : 'Данные организатора'],
    ['Лист', sheet],
  ]
  return `<dl class="stamp">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`
}
