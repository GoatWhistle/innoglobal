import { Vector3 } from "three"
import { SHEET } from "./metrics.js"

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

function fitDistance(points, target, direction, camera, aspect, margin) {
  const right = new Vector3(0, 1, 0).cross(direction).normalize()
  const up = direction.clone().cross(right).normalize()
  const tan = Math.tan((camera.fov * Math.PI) / 360)
  let distance = 0
  const p = new Vector3()
  for (const point of points) {
    p.copy(point).sub(target)
    const depth = p.dot(direction)
    distance = Math.max(
      distance,
      Math.abs(p.dot(right)) / (tan * aspect) + depth,
      Math.abs(p.dot(up)) / tan + depth,
    )
  }
  return distance * margin
}

function centerPose(points, pose, direction, verticalCenter) {
  const right = new Vector3(0, 1, 0).cross(direction).normalize()
  const up = direction.clone().cross(right).normalize()
  const distance = pose.position.distanceTo(pose.target)
  for (let pass = 0; pass < 4; pass++) {
    const projected = points.map((point) => {
      const relative = point.clone().sub(pose.target)
      const depth = distance - relative.dot(direction)
      return [relative.dot(right) / depth, relative.dot(up) / depth]
    })
    const x = projected.map((point) => point[0])
    const y = projected.map((point) => point[1])
    const offset = right
      .clone()
      .multiplyScalar(((Math.min(...x) + Math.max(...x)) * distance) / 2)
      .addScaledVector(up, ((Math.min(...y) + Math.max(...y)) / 2 - verticalCenter) * distance)
    pose.target.add(offset)
    pose.position.add(offset)
  }
  return pose
}

export function poses(camera, { L, R }, width, height, cutX, _wide) {
  const aspect = width / height,
    tan = Math.tan((camera.fov * Math.PI) / 360)
  const axis = Array.from({ length: 13 }, (_, i) => (i / 12 - 0.5) * L)
  const tube = axis.flatMap((x) => [
    new Vector3(x, R, 0),
    new Vector3(x, -R, 0),
    new Vector3(x, 0, R),
    new Vector3(x, 0, -R),
  ])
  const az = aspect < 1.3 ? 1.02 : 0.68,
    el = aspect < 1.3 ? 0.28 : 0.24
  const routeDir = new Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  ).normalize()
  const routeTarget = new Vector3(0, aspect < 1.3 ? -R * 0.2 : R * 0.1, 0)
  const route = centerPose(
    tube,
    {
      target: routeTarget,
      position: routeTarget
        .clone()
        .addScaledVector(
          routeDir,
          fitDistance(tube, routeTarget, routeDir, camera, aspect, aspect < 1.3 ? 1.06 : 1.08),
        ),
      shift: 0,
    },
    routeDir,
    aspect < 1.3 ? -tan * 0.16 : 0,
  )
  const inner = Math.max(1, width - SHEET.left - SHEET.right)
  let scale = inner / L
  const room = Math.max(1, height - SHEET.top - SHEET.bottom)
  const C = Math.PI * 2 * R
  if (C * scale > room) scale = room / C
  const visible = width / scale
  const d = visible / (2 * tan * aspect)
  const sheetLeft = (width - L * scale) / 2 > SHEET.left ? (width - L * scale) / 2 : SHEET.left
  const sheetCenter = sheetLeft + (L * scale) / 2
  const camX = -(sheetCenter - width / 2) / scale
  const camY = (SHEET.top + room / 2 - height / 2) / scale
  const unroll = {
    target: new Vector3(camX, camY, R),
    position: new Vector3(camX, camY, R + d),
    shift: 0,
  }
  const cutTarget = new Vector3(cutX, 0, 0)
  const sectionDir = new Vector3(0.74, 0.3, 0.6).normalize()
  const ringPoints = Array.from(
    { length: 16 },
    (_, i) =>
      new Vector3(cutX, Math.cos((i / 16) * Math.PI * 2) * R, Math.sin((i / 16) * Math.PI * 2) * R),
  )
  const section = {
    target: cutTarget,
    position: cutTarget
      .clone()
      .addScaledVector(
        sectionDir,
        fitDistance(ringPoints, cutTarget, sectionDir, camera, aspect, aspect < 1.3 ? 1.5 : 1.65),
      ),
    shift: 0,
  }
  return { route, unroll, section, sheetScale: scale }
}

export function createFlight(camera) {
  const from = { position: new Vector3(), target: new Vector3(), shift: 0 }
  const to = { position: new Vector3(), target: new Vector3(), shift: 0 }
  const look = new Vector3()
  let start = 0,
    duration = 0,
    done = true,
    width = 1,
    height = 1,
    currentShift = 0
  function apply(k) {
    camera.position.lerpVectors(from.position, to.position, k)
    look.lerpVectors(from.target, to.target, k)
    const shift = from.shift + (to.shift - from.shift) * k
    currentShift = shift
    camera.lookAt(look)
    if (Math.abs(shift) > 0.5) camera.setViewOffset(width, height, shift, 0, width, height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }
  return {
    rotate(dx, dy) {
      if (!done) return
      const offset = camera.position.clone().sub(look)
      const radius = offset.length()
      const yaw = Math.atan2(offset.x, offset.z) - dx * Math.PI * 2
      const pitch = Math.max(
        0.08,
        Math.min(Math.PI - 0.08, Math.acos(offset.y / radius) - dy * Math.PI),
      )
      camera.position.set(
        look.x + radius * Math.sin(pitch) * Math.sin(yaw),
        look.y + radius * Math.cos(pitch),
        look.z + radius * Math.sin(pitch) * Math.cos(yaw),
      )
      camera.lookAt(look)
      camera.updateMatrixWorld()
    },
    size(w, h) {
      width = w
      height = h
      camera.aspect = w / h
    },
    go(pose, ms, now) {
      from.position.copy(camera.position)
      from.target.copy(look)
      from.shift = currentShift
      to.position.copy(pose.position)
      to.target.copy(pose.target)
      to.shift = pose.shift
      start = now
      duration = ms
      done = ms <= 0
      if (done) apply(1)
    },
    step(now) {
      if (done) return false
      const k = Math.min(1, (now - start) / duration)
      apply(ease(k))
      if (k >= 1) done = true
      return true
    },
    progress(now) {
      return done ? 1 : ease(Math.min(1, (now - start) / duration))
    },
    get moving() {
      return !done
    },
  }
}
