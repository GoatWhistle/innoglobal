import { SEGMENT_M } from "./sim.js"

export const HALF = 12

export function toWorld(m) {
  return (m / SEGMENT_M) * 2 * HALF - HALF
}

export function toMeters(x) {
  return ((x + HALF) / (2 * HALF)) * SEGMENT_M
}

export function frameFor(width, height) {
  const portrait = width / height < 0.85
  return {
    portrait,
    radius: portrait ? 1.05 : 0.52,
    gap: portrait ? 1.4 : 0.6,
    height: portrait ? 17 : 5.2,
    fov: portrait ? 24 : 20,
    margin: portrait ? 28 : 96,
    yaw: portrait ? -0.06 : -0.22,
    elevation: portrait ? 0.2 : 0.17,
    topRow: portrait ? 0.39 : 0.2,
    stain: portrait ? 6.4 : 3.6,
  }
}
