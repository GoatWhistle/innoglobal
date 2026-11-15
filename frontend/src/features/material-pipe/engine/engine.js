import { buildScene } from "./construction.js"
import { createControls } from "./controls.js"
import { createDischarge } from "./discharge.js"
import { createInspection } from "./inspection.js"
import { createIntro } from "./intro.js"
import { createLiquid } from "./liquid.js"
export function createPipe(host, name, onPhase = () => {}, options = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)")
  const events = new AbortController()
  let frameId = 0
  const {
    renderer,
    scene,
    camera,
    group,
    wallMat,
    oilMat,
    label,
    marker,
    damageMap,
    corrosionMap,
  } = buildScene(host, name)
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight
    if (!w || !h) return
    label.visible =
      w >= 600 &&
      wallMat.uniforms.cut.value === 0 &&
      (!host.dataset.inspection || host.dataset.inspection === "idle")
    renderer.setSize(w, h, false)
    camera.top = (6.5 * h) / w
    camera.bottom = -camera.top
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  let active = false
  const visibility = new IntersectionObserver((entries) => {
    active = entries[0].isIntersecting
  })
  visibility.observe(host)
  const seed = flowSeed(name)
  const state = { manualView: false, inspection: null, level: 0.16 + seed * 0.12 }
  const { updateLiquid, impulse, advance } = createLiquid({
    host,
    group,
    camera,
    oilMat,
    state,
    reduced,
  })
  const { tickIntro, nudge } = options.intro
    ? createIntro({ group, state, reduced, impulse, ...options.intro })
    : { tickIntro: () => {}, nudge: () => {} }
  const { defectRoot, defectLip, stream, animateDischarge } = createDischarge(group)
  const { clearInspection, startInspection, tickInspection } = createInspection({
    host,
    group,
    camera,
    wallMat,
    label,
    marker,
    defectRoot,
    defectLip,
    stream,
    animateDischarge,
    reduced,
    onPhase,
    state,
  })

  const pace = 0.7 + seed * 0.6
  let clock = 2 + seed * 37,
    lastTime = 0
  function frame(ms) {
    frameId = requestAnimationFrame(frame)
    const delta = Math.min((ms - lastTime) / 1000, 0.05)
    lastTime = ms
    if (!active || document.hidden) return
    if (!reduced.matches) clock += delta * pace
    advance(delta * pace)
    tickIntro(delta)
    oilMat.uniforms.time.value = clock
    wallMat.uniforms.time.value = clock
    tickInspection(delta, clock)
    updateLiquid(delta)
    tickControls(delta)
    renderer.render(scene, camera)
  }
  frameId = requestAnimationFrame(frame)
  const { zoomBy, fitView, tickControls } = createControls({
    host,
    renderer,
    camera,
    group,
    state,
    reduced,
    events,
    impulse,
    clearInspection,
  })
  host.dataset.renderer = "webgl"
  return {
    dispose() {
      cancelAnimationFrame(frameId)
      events.abort()
      observer.disconnect()
      visibility.disconnect()
      scene.traverse((object) => {
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          if (!material) continue
          material.map?.dispose()
          material.dispose()
        }
      })
      damageMap.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
    zoom: zoomBy,
    fit: fitView,
    nudge,
    corrosionMap,
    inspect: startInspection,
    cancelInspection: clearInspection,
    reset() {
      clearInspection()
      group.rotation.set(0, 0, 0)
    },
    mark(fraction) {
      if (state.inspection || !marker) return
      marker.visible = fraction !== null
      if (fraction !== null) marker.position.x = -4.4 + Math.max(0, Math.min(1, fraction)) * 8.8
    },
    renderer,
    scene,
    camera,
  }
}

function flowSeed(name) {
  let hash = 2166136261
  for (const char of name) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0) / 4294967295
}
