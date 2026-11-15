import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  PerspectiveCamera,
  Raycaster,
  RepeatWrapping,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three"
import { createFlight, poses } from "./camera.js"
import { buildCap } from "./cut.js"
import { fieldData } from "./field.js"
import { DIM } from "./geometry.js"
import { bindSceneInput } from "./interaction.js"
import { pickCylinder, pickSheet } from "./picking.js"
import { annotationFrame } from "./projection.js"
import { raw, token, wallStops } from "./scale.js"
import { createSceneParts } from "./scene.js"
import { createStudio } from "./studio.js"
import { createTextures, disposeTextures } from "./textures.js"

export function createWallEngine(canvas, { onPick, onFrame, onFailure, durations }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  const studio = createStudio(renderer),
    textures = createTextures()
  const scene = new Scene(),
    camera = new PerspectiveCamera(30, 1, 0.05, 200),
    flight = createFlight(camera)
  const {
    uniforms,
    wall,
    capUniforms,
    capGeometry,
    oilGeometry,
    cap,
    oilUniforms,
    oil,
    outline,
    props,
  } = createSceneParts(scene, textures)
  let outlineMax = 1
  const ray = new Raycaster(),
    pointer = new Vector2()
  let pipeline = null,
    selected = 0,
    mode = "route",
    width = 1,
    height = 1,
    frame = 0,
    stopped = false,
    texture = null,
    layout = null,
    wide = false
  const anim = { unroll: [0, 0], dissolve: [0, 0], cap: [0, 0] }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)")
  const events = new AbortController()
  const span = () => {
    const s = pipeline.segments[selected]
    return [s.startM / pipeline.lengthM, s.endM / pipeline.lengthM]
  }
  function targets() {
    const unroll = mode === "unroll" ? 1 : 0,
      section = mode === "section" ? 1 : 0
    anim.unroll = [uniforms.uUnroll.value, unroll]
    anim.dissolve = [uniforms.uDissolve.value, section]
    anim.cap = [capUniforms.uOpacity.value, section]
  }
  function go(ms) {
    if (!pipeline?.segments[selected]) return
    const [, end] = span()
    layout = poses(camera, DIM, width, height, (end - 0.5) * DIM.L, wide)
    if (mode === "section") uniforms.uCut.value = end
    targets()
    flight.go(layout[mode], reduced.matches ? 0 : ms, performance.now())
    if (reduced.matches || ms <= 0) blend(1)
    request()
  }
  function blend(k) {
    uniforms.uUnroll.value = anim.unroll[0] + (anim.unroll[1] - anim.unroll[0]) * k
    uniforms.uDissolve.value =
      anim.dissolve[0] + (anim.dissolve[1] - anim.dissolve[0]) * Math.min(1, k * 1.6)
    capUniforms.uOpacity.value =
      anim.cap[0] + (anim.cap[1] - anim.cap[0]) * Math.max(0, (k - 0.35) / 0.65)
    if (mode !== "section" && uniforms.uDissolve.value < 0.001) uniforms.uCut.value = 2
    for (const line of outline) line.material.opacity = capUniforms.uOpacity.value * outlineMax
    props.update(uniforms.uUnroll.value, uniforms.uCut.value)
  }
  function draw(now) {
    frame = 0
    if (stopped || document.hidden || !pipeline) return
    try {
      const moving = flight.step(now)
      blend(flight.progress(now))
      cap.visible = oil.visible = capUniforms.uOpacity.value > 0.001
      for (const line of outline) line.visible = cap.visible
      const flowing = oil.visible && !reduced.matches && capUniforms.uDrawing.value < 0.5
      oilUniforms.uTime.value = now / 1000
      renderer.render(scene, camera)
      onFrame?.(
        annotationFrame(
          camera,
          width,
          height,
          pipeline,
          selected,
          mode,
          uniforms.uUnroll.value,
          moving,
        ),
      )
      if (moving || flowing) request()
    } catch (error) {
      stopped = true
      onFailure(error.message)
    }
  }
  function request() {
    if (!frame && !stopped) frame = requestAnimationFrame(draw)
  }
  function pick(event) {
    if (!pipeline || flight.moving) return null
    const r = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    )
    ray.setFromCamera(pointer, camera)
    const o = ray.ray.origin,
      d = ray.ray.direction
    return mode === "unroll" ? pickSheet(o, d) : pickCylinder(o, d, mode, uniforms.uCut.value)
  }
  bindSceneInput(
    canvas,
    {
      select: (event) => {
        const hit = pick(event)
        if (hit) onPick({ meters: hit.u * pipeline.lengthM, hour: hit.hour })
      },
      hover: (event) => {
        const hit = mode === "section" ? null : pick(event)
        uniforms.uHover.value = hit ? hit.u : -1
        canvas.style.cursor = hit ? "crosshair" : "default"
        request()
      },
      leave: () => {
        uniforms.uHover.value = -1
        request()
      },
      fail: () => {
        stopped = true
        cancelAnimationFrame(frame)
        onFailure("WebGL context lost")
      },
      request,
    },
    events.signal,
  )
  const api = {
    setData(data) {
      pipeline = data
      texture?.dispose()
      const field = fieldData(data)
      texture = new DataTexture(field.data, field.width, field.height)
      texture.magFilter = texture.minFilter = LinearFilter
      texture.wrapS = ClampToEdgeWrapping
      texture.wrapT = RepeatWrapping
      texture.needsUpdate = true
      uniforms.uField.value = texture
      uniforms.uTexScale.value = data.lengthM / (10 * field.width)
      uniforms.uLength.value = data.lengthM
      selected = Math.min(selected, data.segments.length - 1)
      this.select(selected, true)
    },
    select(id, instant = false) {
      if (!pipeline?.segments[id]) return
      const moved = id !== selected
      selected = id
      const [start, end] = span()
      uniforms.uSel.value = (start + end) / 2
      uniforms.uHalf.value = (end - start) / 2
      buildCap(pipeline, selected, span, capGeometry, oilGeometry, outline)
      if (mode === "section" && (moved || instant)) go(instant ? 0 : durations.move)
      request()
    },
    setMode(next, instant = false) {
      if (next === mode && !instant) return
      mode = next
      go(instant ? 0 : durations[next])
    },
    setTheme(theme) {
      const light = theme === "light"
      const [steel, rust, amber] = wallStops()
      uniforms.uSteel.value.set(...steel)
      uniforms.uRust.value.set(...rust)
      uniforms.uAmber.value.set(...amber)
      uniforms.uInside.value.copy(raw("--crude-pitch"))
      uniforms.uMark.value.copy(raw("--text-primary"))
      uniforms.uGrid.value.copy(raw("--text-primary"))
      uniforms.uAmbient.value = light ? 0.72 : 0.34
      uniforms.uSpec.value = light ? 0.16 : 0.85
      uniforms.uEnv.value = studio.cube(light)
      uniforms.uEnvPower.value = light ? 0.55 : 1
      outlineMax = light ? 1 : 0.28
      props.setTheme(light, raw)
      capUniforms.uPaper.value.copy(raw("--surface-raised"))
      capUniforms.uInk.value.copy(raw("--drawing-line"))
      capUniforms.uDrawing.value = light ? 1 : 0
      oilUniforms.uCrude.value.copy(light ? raw("--surface-sunken") : raw("--crude-pitch"))
      oilUniforms.uSheen.value.copy(raw("--crude-amber"))
      for (const line of outline) line.material.color.copy(token("--drawing-contour"))
      request()
    },
    resize(w, h, isWide) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      wide = isWide
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
      renderer.setSize(width, height, false)
      flight.size(width, height)
      go(0)
    },
    dispose() {
      stopped = true
      cancelAnimationFrame(frame)
      events.abort()
      texture?.dispose()
      props.dispose()
      studio.dispose()
      disposeTextures(textures)
      for (const o of [wall, cap, oil, ...outline]) {
        o.geometry.dispose()
        o.material.dispose()
      }
      renderer.dispose()
    },
  }
  return api
}
