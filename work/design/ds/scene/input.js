import { Raycaster, Vector2, Vector3 } from "three"
import { HALF } from "./layout.js"
import { HOLE_ANGLE } from "./pipe.js"

export function frontPoint(x, radius) {
  return new Vector3(x, radius + Math.sin(HOLE_ANGLE) * radius, Math.cos(HOLE_ANGLE) * radius)
}

export function frontNormal() {
  return new Vector3(0, Math.sin(HOLE_ANGLE), Math.cos(HOLE_ANGLE))
}

export function createInput({ canvas, camera, targets, radius }) {
  const raycaster = new Raycaster()
  const pointer = new Vector2()

  function ndc(event) {
    const rect = canvas.getBoundingClientRect()
    return new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  return {
    pointer,
    track(event) {
      pointer.copy(ndc(event))
    },
    release() {
      pointer.set(0, 0)
    },
    pick(event) {
      raycaster.setFromCamera(ndc(event), camera)
      const hit = raycaster.intersectObjects(targets(), false)[0]
      if (!hit || Math.abs(hit.point.x) > HALF) return null
      return frontPoint(hit.point.x, radius())
    },
  }
}
