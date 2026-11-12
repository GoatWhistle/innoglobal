import { Vector3 } from "three"
import { HALF } from "./layout.js"

const tmp = new Vector3()
const ORBIT = 0.42

function project(point, eye, yaw, tanH, aspect) {
  const rx = point.x - eye.x
  const ry = point.y - eye.y
  const rz = point.z - eye.z
  const depth = -rx * Math.sin(yaw) - rz * Math.cos(yaw)
  const side = rx * Math.cos(yaw) - rz * Math.sin(yaw)
  return { x: side / (depth * tanH * aspect), y: ry / (depth * tanH) }
}

export function createRig(camera) {
  const eye = new Vector3()
  const state = { distance: 30, height: 2, shift: 0 }
  const orbit = { dragging: false, yaw: 0, start: 0, startX: 0, from: 0, releasedAt: null }

  function place(yaw, height) {
    const d = state.distance
    eye.set(Math.sin(yaw) * d, height, Math.cos(yaw) * d)
  }

  return {
    get dragging() {
      return orbit.dragging
    },
    grab(x) {
      Object.assign(orbit, { dragging: true, startX: x, start: orbit.yaw, releasedAt: null })
    },
    drag(x, width) {
      const span = (x - orbit.startX) / width
      orbit.yaw = Math.min(Math.max(orbit.start - span * 1.1, -ORBIT), ORBIT)
    },
    release(time) {
      Object.assign(orbit, { dragging: false, from: orbit.yaw, releasedAt: time })
    },
    orbit(time, duration, ease) {
      if (!orbit.dragging && orbit.releasedAt !== null) {
        const k = Math.min((time - orbit.releasedAt) / duration, 1)
        orbit.yaw = orbit.from * (1 - ease(k))
        if (k >= 1) orbit.releasedAt = null
      }
      return orbit.yaw
    },
    fit(frame, width, height, top, base) {
      const aspect = width / height
      const tanH = Math.tan((frame.fov * Math.PI) / 360)
      const limit = 1 - (2 * frame.margin) / width
      let lo = 4
      let hi = 600
      for (let i = 0; i < 40; i++) {
        const d = (lo + hi) / 2
        state.distance = d
        place(frame.yaw, base + d * Math.tan(frame.elevation))
        const a = project(tmp.set(-HALF, base, 0), eye, frame.yaw, tanH, aspect)
        const b = project(tmp.set(HALF, base, 0), eye, frame.yaw, tanH, aspect)
        const span = Math.max(Math.abs(a.x), Math.abs(b.x))
        if (span > limit) lo = d
        else hi = d
      }
      state.distance = hi
      state.aspect = aspect
      state.tanH = tanH
      state.top = top
      state.base = base
    },
    aim(frame, width, height, yaw, lift) {
      const h = state.base + state.distance * Math.tan(frame.elevation + lift)
      place(yaw, h)
      camera.position.copy(eye)
      camera.lookAt(eye.x - Math.sin(yaw), eye.y, eye.z - Math.cos(yaw))
      const near = project(tmp.set(-HALF, state.top, 0), eye, yaw, state.tanH, state.aspect)
      const row = ((1 - near.y) / 2) * height
      camera.setViewOffset(width, height, 0, row - frame.topRow * height, width, height)
      camera.updateProjectionMatrix()
    },
  }
}
