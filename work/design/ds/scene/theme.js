import { Color } from "three"

const NAMES = {
  void: "--scene-void",
  crude: "--scene-crude",
  cool: "--scene-sheen-cool",
  warm: "--scene-sheen-warm",
  deep: "--scene-sheen-deep",
  leak: "--scene-leak",
  steel: "--scene-steel",
  ink: "--text-primary",
  muted: "--text-muted",
  danger: "--status-danger",
  warning: "--status-warning",
}

const DRAW = {
  paper: ["--draw-paper", "--scene-void"],
  ink: ["--drawing-contour", "--text-primary"],
  muted: ["--draw-ink-muted", "--text-muted"],
  dimension: ["--drawing-line", "--text-secondary"],
  construction: ["--draw-construction", "--text-disabled"],
  grid: ["--draw-grid", "--text-primary"],
  leak: ["--hatch-danger", "--scene-leak"],
  warn: ["--hatch-warning", "--status-warning"],
}

const DRAW_SIZES = {
  thin: ["--ink-weight-fine", 0.75],
  thick: ["--ink-weight-contour", 1.75],
  outline: ["--ink-weight-line", 1.25],
  hatch: ["--draw-hatch-gap", 4],
  gridMinor: ["--paper-cell", 8],
  gridMajor: ["--paper-cell-major", 40],
}

function withTheme(mode, read) {
  const root = document.documentElement
  const previous = root.dataset.theme
  root.dataset.theme = mode
  const result = read(getComputedStyle(root))
  root.dataset.theme = previous
  return result
}

export function readSceneTheme(mode = "dark") {
  return withTheme(mode, (style) => {
    const colors = {}
    for (const [key, name] of Object.entries(NAMES)) {
      colors[key] = new Color(style.getPropertyValue(name).trim() || "#000")
    }
    return { colors, dark: mode !== "light" }
  })
}

export function readDrawTheme() {
  return withTheme("light", (style) => {
    const pick = (names) => names.map((n) => style.getPropertyValue(n).trim()).find(Boolean)
    const colors = {}
    for (const [key, names] of Object.entries(DRAW)) colors[key] = pick(names) || "#000"
    const sizes = {}
    for (const [key, [name, fallback]] of Object.entries(DRAW_SIZES)) {
      sizes[key] = Number.parseFloat(style.getPropertyValue(name)) || fallback
    }
    return { colors, sizes }
  })
}

export function readMs(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return Number.parseFloat(value) || 0
}

export function readEase(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name)
  const match = /cubic-bezier\(([^)]+)\)/.exec(value)
  if (!match) return (t) => t
  const [x1, y1, x2, y2] = match[1].split(",").map(Number)
  return bezier(x1, y1, x2, y2)
}

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    let t = x
    for (let i = 0; i < 6; i++) {
      const d = dx(t)
      if (Math.abs(d) < 1e-6) break
      t -= (sx(t) - x) / d
    }
    return sy(Math.min(1, Math.max(0, t)))
  }
}
