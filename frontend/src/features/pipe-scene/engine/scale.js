import { Color, Vector3 } from "three"

const tokenValue = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function rgb(value) {
  const color = new Color(value)
  return [color.r, color.g, color.b]
}

export function wallStops() {
  return ["--wall-steel", "--wall-rust", "--wall-amber"].map((name) =>
    rgb(tokenValue(name) || "#888888"),
  )
}

export function shade(stops, value) {
  const [a, b, c] = stops,
    v = Math.max(0, Math.min(1, value))
  const [from, to, k] = v < 0.5 ? [a, b, v * 2] : [b, c, (v - 0.5) * 2]
  return from.map((x, i) => x + (to[i] - x) * k)
}

export const css = (color) => `rgb(${color.map((x) => Math.round(x * 255)).join(" ")})`

export const token = (name) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888")
const vec = (c) => new Vector3(c.r, c.g, c.b)
export const raw = (name) => {
  const c = new Color()
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  c.setStyle(v || "#888", "srgb-linear")
  return vec(c)
}
