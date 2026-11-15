const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function rgb(hex) {
  const v = hex.replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
}

export function wallStops() {
  return ['--wall-steel', '--wall-rust', '--wall-amber'].map((name) => rgb(token(name) || '#888888'))
}

export function shade(stops, value) {
  const [a, b, c] = stops, v = Math.max(0, Math.min(1, value))
  const [from, to, k] = v < 0.5 ? [a, b, v * 2] : [b, c, (v - 0.5) * 2]
  return from.map((x, i) => x + (to[i] - x) * k)
}

export const css = (color) => `rgb(${color.map((x) => Math.round(x * 255)).join(' ')})`
