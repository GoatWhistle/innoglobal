import { number } from '../scanner/format.js'
import { HOURS, fieldData, relative, thinnest } from './field.js'
import { css, shade, wallStops } from './scale.js'

const cache = new WeakMap()

function heat(pipeline, rows) {
  const key = `${rows}:${document.documentElement.dataset.theme}`
  const entry = cache.get(pipeline) ?? {}
  if (entry[key]) return entry[key]
  const stops = wallStops(), canvas = document.createElement('canvas'), w = pipeline.segments.length
  canvas.width = w; canvas.height = rows
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(w, rows)
  if (rows === 1) {
    const floor = thinnest(pipeline)
    pipeline.segments.forEach((s, i) => { const c = shade(stops, relative(pipeline, s.predictedMm, floor)); image.data.set([...c.map((x) => x * 255), 255], i * 4) })
  } else {
    const field = fieldData(pipeline)
    for (let h = 0; h < HOURS; h++) for (let i = 0; i < w; i++) {
      const c = shade(stops, field.data[(h * w + i) * 4] / 255)
      image.data.set([...c.map((x) => x * 255), 255], ((HOURS - 1 - h) * w + i) * 4)
    }
  }
  ctx.putImageData(image, 0, 0)
  entry[key] = canvas.toDataURL(); cache.set(pipeline, entry)
  return entry[key]
}

export const stripImage = (pipeline) => heat(pipeline, 1)
export const sheetImage = (pipeline) => heat(pipeline, HOURS)

export function flatSheet(pipeline, segment, hour, width = 800) {
  const left = 36, right = 18, top = 24, inner = width - left - right, height = Math.round(inner / 4.55), bottom = top + height
  const x = (m) => left + m / pipeline.lengthM * inner, y = (h) => top + (12 - h) / 12 * height
  const km = Array.from({ length: Math.floor(pipeline.lengthM / 1000) + 1 }, (_, i) => i * 1000)
  const sx = x((segment.startM + segment.endM) / 2), sy = y(hour)
  return `<svg class="flat-sheet" viewBox="0 0 ${width} ${bottom + 30}" role="img" aria-label="Развёртка стенки: ось вдоль трубы и по окружности в часах">
<image href="${heat(pipeline, HOURS)}" x="${left}" y="${top}" width="${inner}" height="${height}" preserveAspectRatio="none" style="image-rendering:pixelated"/>
${[12, 9, 6, 3, 0].map((h) => `<path class="sheet-grid" d="M${left} ${y(h)}H${left + inner}"/><text class="sheet-label" x="${left - 8}" y="${y(h) + 4}" text-anchor="end">${h || 12}</text>`).join('')}
${km.map((m, i) => `<path class="sheet-grid" d="M${x(m)} ${top}V${bottom + 4}"/>${i % 2 === 0 || km.length < 8 ? `<text class="sheet-label" x="${x(m)}" y="${bottom + 18}" text-anchor="middle">${m / 1000}</text>` : ''}`).join('')}
<text class="sheet-label" x="${left + inner}" y="${bottom + 30}" text-anchor="end">км</text>
<path class="sheet-cursor" d="M${sx} ${top - 6}V${bottom + 6}"/><circle class="sheet-point" cx="${sx}" cy="${sy}" r="5"/>
</svg>`
}

export function flatRoute(pipeline, segment, width = 800) {
  const left = 36, right = 18, inner = width - left - right, x = (m) => left + m / pipeline.lengthM * inner
  const km = Array.from({ length: Math.floor(pipeline.lengthM / 2000) + 1 }, (_, i) => i * 2000)
  const sx = x((segment.startM + segment.endM) / 2)
  return `<svg class="flat-route" viewBox="0 0 ${width} 150" role="img" aria-label="Трасса: минимальная толщина по сегментам, выбран сегмент ${segment.id}">
<image href="${stripImage(pipeline)}" x="${left}" y="52" width="${inner}" height="40" preserveAspectRatio="none" style="image-rendering:pixelated"/>
<rect class="route-outline" x="${left}" y="52" width="${inner}" height="40"/>
${km.map((m) => `<path class="sheet-grid" d="M${x(m)} 96V104"/><text class="sheet-label" x="${x(m)}" y="120" text-anchor="middle">ПК ${number(m / 100)}</text>`).join('')}
<path class="sheet-cursor" d="M${sx} 40V104"/>
</svg>`
}
