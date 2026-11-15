import * as THREE from "three"
export function createControls({
  host,
  renderer,
  camera,
  group,
  state,
  reduced,
  events,
  impulse,
  clearInspection,
}) {
  let zoomTarget = 1,
    panX = 0,
    panY = 0
  const pointers = new Map()
  let pinchDistance = 0,
    pinchCenter = null
  function claimView() {
    if (!state.manualView) {
      zoomTarget = camera.zoom
      panX = camera.position.x
      panY = camera.position.y
    }
    state.manualView = true
    if (state.inspection) state.inspection.manual = true
  }
  function zoomBy(factor, clientX, clientY) {
    claimView()
    const previous = zoomTarget
    zoomTarget = THREE.MathUtils.clamp(previous * factor, 0.35, 6)
    if (clientX != null) {
      const rect = host.getBoundingClientRect(),
        nx = (clientX - rect.left) / rect.width - 0.5,
        ny = 0.5 - (clientY - rect.top) / rect.height
      panX += nx * (camera.right - camera.left) * (1 / previous - 1 / zoomTarget)
      panY += ny * (camera.top - camera.bottom) * (1 / previous - 1 / zoomTarget)
    }
    panX = THREE.MathUtils.clamp(panX, -7, 7)
    panY = THREE.MathUtils.clamp(panY, -5, 5)
  }
  function fitView() {
    claimView()
    zoomTarget = 1
    panX = 0
    panY = 0
    group.rotation.set(0, 0, 0)
  }
  function panBy(dx, dy) {
    claimView()
    panX = THREE.MathUtils.clamp(
      panX - ((dx / host.clientWidth) * (camera.right - camera.left)) / zoomTarget,
      -7,
      7,
    )
    panY = THREE.MathUtils.clamp(
      panY + ((dy / host.clientHeight) * (camera.top - camera.bottom)) / zoomTarget,
      -5,
      5,
    )
  }
  function tickControls(dt) {
    if (!state.manualView) return
    const blend = reduced.matches ? 1 : 1 - Math.exp(-dt * 18)
    camera.zoom = THREE.MathUtils.lerp(camera.zoom, zoomTarget, blend)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, panX, blend)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, panY, blend)
    camera.lookAt(camera.position.x, camera.position.y, 0)
    camera.updateProjectionMatrix()
  }
  renderer.domElement.style.touchAction = "none"
  host.style.cursor = "grab"
  host.tabIndex = 0
  host.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault()
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? host.clientHeight : 1)
      zoomBy(Math.exp(-THREE.MathUtils.clamp(delta, -180, 180) * 0.002), e.clientX, e.clientY)
    },
    { passive: false, signal: events.signal },
  )
  host.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 && e.button !== 1) return
      e.preventDefault()
      host.focus({ preventScroll: true })
      claimView()
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      host.setPointerCapture(e.pointerId)
      host.style.cursor = "grabbing"
      pinchDistance = 0
      pinchCenter = null
    },
    { signal: events.signal },
  )
  host.addEventListener(
    "pointermove",
    (e) => {
      const previous = pointers.get(e.pointerId)
      if (!previous) return
      const dx = e.clientX - previous.x,
        dy = e.clientY - previous.y
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()],
          distance = Math.hypot(a.x - b.x, a.y - b.y),
          center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        if (pinchDistance > 0) {
          zoomBy(distance / pinchDistance, center.x, center.y)
          panBy(center.x - pinchCenter.x, center.y - pinchCenter.y)
        }
        pinchDistance = distance
        pinchCenter = center
      } else if (e.shiftKey || e.buttons === 4) {
        panBy(dx, dy)
      } else {
        impulse(dx, dy)
        group.rotation.y += dx * 0.004
        group.rotation.x += dy * 0.004
      }
    },
    { signal: events.signal },
  )
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    host.addEventListener(
      name,
      (e) => {
        pointers.delete(e.pointerId)
        pinchDistance = 0
        pinchCenter = null
        if (!pointers.size) host.style.cursor = "grab"
      },
      { signal: events.signal },
    )
  host.addEventListener(
    "keydown",
    (e) => {
      if (["+", "=", "-", "0"].includes(e.key)) {
        e.preventDefault()
        if (e.key === "0") {
          state.manualView = false
          clearInspection()
          group.rotation.set(0, 0, 0)
        } else zoomBy(e.key === "-" ? 1 / 1.2 : 1.2)
        return
      }
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return
      e.preventDefault()
      claimView()
      const [dx, dy] = {
        ArrowLeft: [-24, 0],
        ArrowRight: [24, 0],
        ArrowUp: [0, -24],
        ArrowDown: [0, 24],
      }[e.key]
      if (e.shiftKey) panBy(dx, dy)
      else {
        impulse(dx, dy)
        group.rotation.y += dx * 0.004
        group.rotation.x += dy * 0.004
      }
    },
    { signal: events.signal },
  )
  return { zoomBy, fitView, tickControls }
}
