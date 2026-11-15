import { Vector3 } from "three"
export const DIM = { L: 12, R: 0.42 }
export const ANGLES = 96
export function hourPoint(u, hour, t, r = DIM.R) {
  const v = hour / 12,
    s = (v - 0.5) * 2 * Math.PI * DIM.R,
    k = Math.max((1 - t) / DIM.R, 1e-4),
    a = k * s
  const y = (Math.sin(a) / k) * (r / DIM.R),
    z = DIM.R - (1 - Math.cos(a)) / k
  const b = ((1 - t) * Math.PI) / 2,
    zz = t < 1 ? z * (r / DIM.R) : z
  return new Vector3(
    (u - 0.5) * DIM.L,
    y * Math.cos(b) - zz * Math.sin(b),
    y * Math.sin(b) + zz * Math.cos(b),
  )
}
