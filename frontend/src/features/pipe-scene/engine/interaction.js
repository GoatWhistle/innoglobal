export function bindSceneInput(canvas, callbacks, signal) {
  const options = { signal }
  canvas.addEventListener("pointerdown", callbacks.select, options)
  canvas.addEventListener("pointermove", callbacks.hover, options)
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
