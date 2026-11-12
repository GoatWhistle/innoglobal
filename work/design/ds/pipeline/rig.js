import { Vector3 } from "three"
import { curve, DIM } from "./route.js"

const POINTS = Array.from({ length: 41 }, (_, i) => curve.getPointAt(i / 40)).flatMap((p) => [p.clone().setY(p.y + DIM.jacket + 0.85), p.clone().setY(0)])
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function createRig(camera) {
  let azimuth = 0.3
  const elevation = 0.34
  const center = new Vector3(), focus = new Vector3(), look = new Vector3(), direction = new Vector3()
  let distance = 20, near = 10, yaw = 0, pitch = 0, yawTo = 0, pitchTo = 0, blend = 0, blendTo = 0, aspect = 1
  const aim = (a, e, out) => out.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e))
  function fit(width, height) {
    aspect = width / height
    azimuth = aspect < 1.2 ? 0.98 : aspect < 1.7 ? 0.55 : 0.3
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    aim(azimuth, elevation, direction)
    const right = new Vector3(0, 1, 0).cross(direction).normalize()
    const up = direction.clone().cross(right).normalize()
    const tan = Math.tan(camera.fov * Math.PI / 360)
    center.set(0, 0, 0)
    for (const p of POINTS) center.add(p)
    center.multiplyScalar(1 / POINTS.length).setY(DIM.axis * 0.6 + 0.55)
    distance = 0
    const p = new Vector3()
    for (const point of POINTS) {
      p.copy(point).sub(center)
      const depth = p.dot(direction)
      distance = Math.max(distance, Math.abs(p.dot(right)) / (tan * aspect) + depth, Math.abs(p.dot(up)) / tan + depth)
    }
    distance *= aspect < 1.2 ? 1.02 : 1.13
    near = clamp((aspect < 1.2 ? 3.3 : 7.2) / (tan * aspect), 11, distance)
  }
  return {
    fit,
    focus(point) {
      blendTo = point ? 1 : 0
      if (point) focus.copy(point).setY(DIM.axis * 0.8).add(new Vector3(0, 0, 0.9))
    },
    orbit(dx, dy) {
      yawTo = clamp(yawTo - dx * 0.0035, -0.9, 0.6)
      pitchTo = clamp(pitchTo + dy * 0.003, -0.2, 0.34)
    },
    home() { yawTo = 0; pitchTo = 0 },
    update(dt, clock, reduced) {
      const ease = reduced ? 1 : 1 - Math.exp(-dt * 2.4)
      const quick = reduced ? 1 : 1 - Math.exp(-dt * 9)
      const before = blend + yaw * 3 + pitch * 7
      blend += (blendTo - blend) * ease
      yaw += (yawTo - yaw) * quick
      pitch += (pitchTo - pitch) * quick
      const drift = reduced ? 0 : Math.sin(clock * 0.21) * 0.035
      const k = blend * blend * (3 - 2 * blend)
      look.copy(center).lerp(focus, k)
      aim(azimuth + yaw + drift, clamp(elevation + pitch - k * 0.06, 0.08, 0.9), direction)
      camera.position.copy(look).addScaledVector(direction, distance + (near - distance) * k)
      camera.lookAt(look)
      camera.updateMatrixWorld()
      return drift !== 0 || Math.abs(blend + yaw * 3 + pitch * 7 - before) > 1e-5
    },
  }
}
