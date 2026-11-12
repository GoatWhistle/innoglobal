import { CatmullRomCurve3, Vector3 } from "three"

export const DIM = { steel: 0.62, wall: 0.05, wool: 0.8, jacket: 0.826, axis: 1.95 }
export const SPAN = [0.06, 0.94]
export const CUT = { jacket: [0.352, 0.648], wool: [0.384, 0.616], steel: [0.44, 0.562], sector: [-0.42, 1.78] }
export const JOINTS = [0.148, 0.852]
export const GAP = 0.021
export const SUPPORTS = [0.1, 0.3, 0.5, 0.7, 0.9]
export const HOLE_ANGLE = 1.92
const UP = new Vector3(0, 1, 0)
const clamp = (v) => Math.min(1, Math.max(0, v))

export const curve = new CatmullRomCurve3([
  [-8.6, 0.55], [-4.2, 0.2], [0.4, 0], [4.4, -0.75], [7.7, -3.1],
].map(([x, z]) => new Vector3(x, DIM.axis, z)), false, "centripetal")
curve.arcLengthDivisions = 600
export const LENGTH = curve.getLength()

export function frame(s) {
  const center = curve.getPointAt(clamp(s))
  const tangent = curve.getTangentAt(clamp(s)).normalize()
  const side = tangent.clone().cross(UP).normalize()
  const up = side.clone().cross(tangent).normalize()
  return { center, tangent, side, up }
}

export function radial(f, angle) {
  return f.up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(f.side, Math.sin(angle))
}

export function around(f, angle, radius) {
  return f.center.clone().addScaledVector(radial(f, angle), radius)
}

export const toS = (meters) => SPAN[0] + clamp(meters / 12000) * (SPAN[1] - SPAN[0])
export const toMeters = (s) => Math.min(11940, Math.max(60, (s - SPAN[0]) / (SPAN[1] - SPAN[0]) * 12000))

const inside = (s, [a, b]) => s > a && s < b

export function outerRadius(s) {
  if (inside(s, CUT.wool) || JOINTS.some((j) => Math.abs(s - j) < GAP)) return DIM.steel
  if (inside(s, CUT.jacket)) return DIM.wool
  return DIM.jacket
}

const SAMPLES = Array.from({ length: 401 }, (_, i) => curve.getPointAt(i / 400))

export function nearestS(point) {
  let best = 0, distance = Infinity
  for (let i = 0; i < SAMPLES.length; i++) {
    const d = SAMPLES[i].distanceToSquared(point)
    if (d < distance) { distance = d; best = i }
  }
  return best / 400
}

export function surface(meters) {
  const s = toS(meters)
  const f = frame(s)
  const normal = radial(f, HOLE_ANGLE)
  return { s, position: f.center.clone().addScaledVector(normal, outerRadius(s)), normal, tangent: f.tangent, frame: f }
}
