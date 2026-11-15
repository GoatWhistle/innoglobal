import { DIM } from "./geometry.js"
export function pickSheet(o, d) {
  if (Math.abs(d.z) < 1e-6) return null
  const t = (DIM.R - o.z) / d.z,
    x = o.x + d.x * t,
    y = o.y + d.y * t,
    u = x / DIM.L + 0.5,
    v = y / (Math.PI * 2 * DIM.R) + 0.5
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, hour: v * 12 } : null
}
export function pickCylinder(o, d, mode, cut) {
  const a = d.y * d.y + d.z * d.z,
    b = 2 * (o.y * d.y + o.z * d.z),
    c = o.y * o.y + o.z * o.z - DIM.R * DIM.R,
    disc = b * b - 4 * a * c
  if (a < 1e-9 || disc < 0) return null
  for (const t of [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)]) {
    if (t < 0) continue
    const p = o.clone().addScaledVector(d, t),
      u = p.x / DIM.L + 0.5
    if (u < 0 || u > 1 || (mode === "section" && u > cut)) continue
    const angle = Math.atan2(p.z, -p.y)
    return { u, hour: ((angle / (Math.PI * 2) + 0.5) * 12 + 12) % 12 }
  }
  return null
}
