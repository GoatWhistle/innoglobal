const root = document.documentElement
const canvas = document.createElement("canvas")
canvas.width = 1
canvas.height = 1
const paint = canvas.getContext("2d", { willReadFrequently: true })
const probe = document.createElement("i")
probe.style.position = "absolute"
probe.style.visibility = "hidden"

export const THEMES = [
  ["light", "Светлая"],
  ["dark", "Тёмная"],
]

export function make(tag, className, parent, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  parent?.append(node)
  return node
}

export function inTheme(theme, read) {
  const current = root.dataset.theme
  root.dataset.theme = theme
  try {
    return read()
  } finally {
    root.dataset.theme = current
  }
}

export function raw(name) {
  return getComputedStyle(root).getPropertyValue(name).trim()
}

function measure(property, value) {
  probe.style.cssText = "position:absolute;visibility:hidden"
  probe.style.setProperty(property, value)
  document.body.append(probe)
  const result = getComputedStyle(probe).getPropertyValue(property)
  probe.remove()
  return result
}

export function px(name, property = "width") {
  return Number.parseFloat(measure(property, `var(${name})`))
}

export function ms(name) {
  const value = raw(name)
  return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
}

function pixel(color, under) {
  paint.clearRect(0, 0, 1, 1)
  if (under) {
    paint.fillStyle = under
    paint.fillRect(0, 0, 1, 1)
  }
  paint.fillStyle = color
  paint.fillRect(0, 0, 1, 1)
  return [...paint.getImageData(0, 0, 1, 1).data]
}

export function color(name, under) {
  const css = measure("color", `var(${name})`)
  const [sr, sg, sb, alpha] = pixel(css)
  const [r, g, b] = pixel(css, under ?? "#ffffff")
  return { rgb: [r, g, b], source: [sr, sg, sb], alpha: alpha / 255 }
}

export function hex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

function channel(v) {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function num(value, digits = 0) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function walk(rules, visit) {
  for (const rule of rules) {
    if (rule.styleSheet) walk(rule.styleSheet.cssRules, visit)
    else visit(rule)
  }
}

export function semanticNames() {
  const names = new Set()
  for (const sheet of document.styleSheets) {
    let rules = []
    try {
      rules = [...sheet.cssRules]
    } catch {}
    walk(rules, (rule) => {
      if (rule.selectorText !== ':root[data-theme="dark"]') return
      for (const property of rule.style) if (property.startsWith("--")) names.add(property)
    })
  }
  return [...names]
}
