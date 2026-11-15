export function bindSceneInput(canvas, callbacks, signal) {
  const options = { signal }
  let pointer = null
  let dragged = false
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (pointer || event.button !== 0) return
      canvas.focus({ preventScroll: true })
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
      dragged = false
      canvas.setPointerCapture(event.pointerId)
    },
    options,
  )
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!pointer || pointer.id !== event.pointerId) {
        callbacks.hover(event)
        return
      }
      const dx = event.clientX - pointer.x
      const dy = event.clientY - pointer.y
      if (!dragged && Math.hypot(dx, dy) < 5) return
      dragged = true
      callbacks.rotate(dx / canvas.clientWidth, dy / canvas.clientHeight)
      pointer.x = event.clientX
      pointer.y = event.clientY
    },
    options,
  )
  canvas.addEventListener(
    "pointerup",
    (event) => {
      if (pointer?.id !== event.pointerId) return
      if (!dragged) callbacks.select(event)
      pointer = null
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    },
    options,
  )
  const cancel = () => {
    pointer = null
  }
  canvas.addEventListener("pointercancel", cancel, options)
  canvas.addEventListener("lostpointercapture", cancel, options)
  canvas.addEventListener(
    "keydown",
    (event) => {
      const directions = {
        ArrowLeft: [-0.04, 0],
        ArrowRight: [0.04, 0],
        ArrowUp: [0, -0.04],
        ArrowDown: [0, 0.04],
      }
      const direction = directions[event.key]
      if (!direction) return
      event.preventDefault()
      event.stopPropagation()
      callbacks.rotate(...direction)
    },
    options,
  )
  canvas.addEventListener("pointerleave", callbacks.leave, options)
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault()
      callbacks.fail()
    },
    options,
  )
  document.addEventListener("visibilitychange", callbacks.request, options)
}
