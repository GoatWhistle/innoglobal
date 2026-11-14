import { BufferAttribute, BufferGeometry, ClampToEdgeWrapping, Color, DataTexture, DoubleSide, LinearFilter, LineBasicMaterial, LineLoop, Mesh, PerspectiveCamera, PlaneGeometry, Raycaster, RepeatWrapping, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from 'three'
import { createFlight, poses } from './camera.js'
import { fieldData, ring } from './field.js'
import { wallStops } from './scale.js'
import { wallFragment, wallVertex } from './shaders.js'
import { capFragment, capVertex, oilFragment, oilVertex } from './shaders-cut.js'
import { createProps } from './props.js'
import { createStudio } from '../pipeline/studio.js'
import { createTextures, disposeTextures } from '../pipeline/textures.js'

const DIM = { L: 12, R: 0.42 }
const ANGLES = 96
const DURATION = { route: 1250, unroll: 1250, section: 1000, move: 800 }
const token = (name) => new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888')
const vec = (c) => new Vector3(c.r, c.g, c.b)
const raw = (name) => { const c = new Color(); const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); c.setStyle(v || '#888', 'srgb-linear'); return vec(c) }

export function hourPoint(u, hour, t, r = DIM.R) {
  const v = hour / 12, s = (v - 0.5) * 2 * Math.PI * DIM.R, k = Math.max((1 - t) / DIM.R, 1e-4), a = k * s
  const y = Math.sin(a) / k * (r / DIM.R), z = DIM.R - (1 - Math.cos(a)) / k
  const b = (1 - t) * Math.PI / 2, zz = t < 1 ? z * (r / DIM.R) : z
  return new Vector3((u - 0.5) * DIM.L, y * Math.cos(b) - zz * Math.sin(b), y * Math.sin(b) + zz * Math.cos(b))
}

export function createWallEngine(canvas, { onPick, onFrame, onFailure }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  const studio = createStudio(renderer), textures = createTextures()
  const scene = new Scene(), camera = new PerspectiveCamera(30, 1, 0.05, 200), flight = createFlight(camera)
  const uniforms = {
    uField: { value: null }, uUnroll: { value: 0 }, uL: { value: DIM.L }, uR: { value: DIM.R }, uCut: { value: 2 }, uDissolve: { value: 0 },
    uSel: { value: 0.5 }, uHalf: { value: 0 }, uHover: { value: -1 }, uTexScale: { value: 1 }, uLength: { value: 12000 },
    uSteel: { value: new Vector3() }, uRust: { value: new Vector3() }, uAmber: { value: new Vector3() }, uInside: { value: new Vector3() },
    uMark: { value: new Vector3() }, uGrid: { value: new Vector3() }, uLight: { value: new Vector3(-0.35, 0.85, 0.55) }, uAmbient: { value: 0.4 }, uSpec: { value: 0.8 },
    uEnv: { value: null }, uEnvPower: { value: 1 }, uJoints: { value: 16 }, uSteelMap: { value: textures.steel.color }, uSteelNormal: { value: textures.steel.normal }, uSteelSurface: { value: textures.steel.surface },
  }
  const wall = new Mesh(new PlaneGeometry(1, 1, 720, 96).translate(0.5, 0.5, 0), new ShaderMaterial({ uniforms, vertexShader: wallVertex, fragmentShader: wallFragment, side: DoubleSide }))
  wall.frustumCulled = false
  wall.geometry.attributes.uv.array.set(wall.geometry.attributes.position.array.filter((_, i) => i % 3 !== 2))
  const capUniforms = { uSteel: uniforms.uSteel, uRust: uniforms.uRust, uAmber: uniforms.uAmber, uLight: uniforms.uLight, uAmbient: uniforms.uAmbient, uSpec: uniforms.uSpec, uPaper: { value: new Vector3() }, uInk: { value: new Vector3() }, uDrawing: { value: 0 }, uOpacity: { value: 0 }, uEnv: uniforms.uEnv, uEnvPower: uniforms.uEnvPower }
  const capGeometry = new BufferGeometry(), oilGeometry = new BufferGeometry()
  capGeometry.setAttribute('position', new BufferAttribute(new Float32Array((ANGLES + 1) * 2 * 3), 3))
  capGeometry.setIndex(Array.from({ length: ANGLES }, (_, i) => [i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2]).flat())
  capGeometry.setAttribute('aEdge', new BufferAttribute(Float32Array.from({ length: (ANGLES + 1) * 2 }, (_, i) => i % 2), 1))
  oilGeometry.setAttribute('position', new BufferAttribute(new Float32Array((ANGLES + 2) * 3), 3))
  oilGeometry.setAttribute('aRim', new BufferAttribute(Float32Array.from({ length: ANGLES + 2 }, (_, i) => i ? 1 : 0), 1))
  oilGeometry.setIndex(Array.from({ length: ANGLES }, (_, i) => [0, i + 1, i + 2]).flat())
  const cap = new Mesh(capGeometry, new ShaderMaterial({ uniforms: capUniforms, vertexShader: capVertex, fragmentShader: capFragment, side: DoubleSide, transparent: true }))
  const oilUniforms = { uCrude: { value: new Vector3() }, uSheen: { value: new Vector3() }, uLight: uniforms.uLight, uOpacity: capUniforms.uOpacity, uDrawing: capUniforms.uDrawing, uEnv: uniforms.uEnv, uEnvPower: uniforms.uEnvPower, uTime: { value: 0 } }
  const oil = new Mesh(oilGeometry, new ShaderMaterial({ uniforms: oilUniforms, vertexShader: oilVertex, fragmentShader: oilFragment, side: DoubleSide, transparent: true }))
  const outline = [new LineLoop(new BufferGeometry(), new LineBasicMaterial({ transparent: true })), new LineLoop(new BufferGeometry(), new LineBasicMaterial({ transparent: true }))]
  for (const line of outline) line.geometry.setAttribute('position', new BufferAttribute(new Float32Array(ANGLES * 3), 3))
  const props = createProps({ L: DIM.L, R: DIM.R, concrete: textures.concrete.color, shared: uniforms })
  scene.add(...props.meshes, wall, cap, oil, ...outline)
  let outlineMax = 1
  const ray = new Raycaster(), pointer = new Vector2()
  let pipeline = null, selected = 0, mode = 'route', width = 1, height = 1, frame = 0, stopped = false, texture = null, layout = null, wide = false
  const anim = { unroll: [0, 0], dissolve: [0, 0], cap: [0, 0] }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController(), options = { signal: events.signal }
  const span = () => { const s = pipeline.segments[selected]; return [s.startM / pipeline.lengthM, s.endM / pipeline.lengthM] }
  function buildCap() {
    if (!pipeline?.segments[selected]) return
    const [, end] = span(), x = (end - 0.5) * DIM.L, values = ring(pipeline, pipeline.segments[selected], ANGLES)
    const wallScale = DIM.R * 0.28 / pipeline.nominalMm
    const cp = capGeometry.attributes.position.array, op = oilGeometry.attributes.position.array
    const outer = outline[0].geometry.attributes.position.array, inner = outline[1].geometry.attributes.position.array
    op.set([x - 0.004, 0, 0], 0)
    for (let i = 0; i <= ANGLES; i++) {
      const j = i % ANGLES, hour = j / ANGLES * 12, r = DIM.R - values[j] * wallScale
      const a = hourPoint(0, hour, 0, DIM.R), b = hourPoint(0, hour, 0, r)
      cp.set([x + 0.001, a.y, a.z, x + 0.001, b.y, b.z], i * 6)
      op.set([x - 0.004, b.y, b.z], (i + 1) * 3)
      if (i < ANGLES) { outer.set([x + 0.002, a.y, a.z], i * 3); inner.set([x + 0.002, b.y, b.z], i * 3) }
    }
    for (const g of [capGeometry, oilGeometry, outline[0].geometry, outline[1].geometry]) { g.attributes.position.needsUpdate = true; g.computeBoundingSphere() }
  }
  function targets() {
    const unroll = mode === 'unroll' ? 1 : 0, section = mode === 'section' ? 1 : 0
    anim.unroll = [uniforms.uUnroll.value, unroll]; anim.dissolve = [uniforms.uDissolve.value, section]; anim.cap = [capUniforms.uOpacity.value, section]
  }
  function go(ms) {
    if (!pipeline?.segments[selected]) return
    const [, end] = span()
    layout = poses(camera, DIM, width, height, (end - 0.5) * DIM.L, wide)
    if (mode === 'section') uniforms.uCut.value = end
    targets()
    flight.go(layout[mode], reduced.matches ? 0 : ms, performance.now())
    if (reduced.matches || ms <= 0) blend(1)
    request()
  }
  function blend(k) {
    uniforms.uUnroll.value = anim.unroll[0] + (anim.unroll[1] - anim.unroll[0]) * k
    uniforms.uDissolve.value = anim.dissolve[0] + (anim.dissolve[1] - anim.dissolve[0]) * Math.min(1, k * 1.6)
    capUniforms.uOpacity.value = anim.cap[0] + (anim.cap[1] - anim.cap[0]) * Math.max(0, (k - 0.35) / 0.65)
    if (mode !== 'section' && uniforms.uDissolve.value < 0.001) uniforms.uCut.value = 2
    for (const line of outline) line.material.opacity = capUniforms.uOpacity.value * outlineMax
    props.update(uniforms.uUnroll.value, uniforms.uCut.value)
  }
  function draw(now) {
    frame = 0
    if (stopped || document.hidden) return
    try {
      const moving = flight.step(now)
      blend(flight.progress(now))
      cap.visible = oil.visible = capUniforms.uOpacity.value > 0.001
      for (const line of outline) line.visible = cap.visible
      const flowing = oil.visible && !reduced.matches && capUniforms.uDrawing.value < 0.5
      oilUniforms.uTime.value = now / 1000
      renderer.render(scene, camera)
      onFrame?.(api.state())
      if (moving || flowing) request()
    } catch (error) { stopped = true; onFailure(error.message) }
  }
  function request() { if (!frame && !stopped) frame = requestAnimationFrame(draw) }
  function pick(event) {
    if (!pipeline || flight.moving) return null
    const r = canvas.getBoundingClientRect()
    pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const o = ray.ray.origin, d = ray.ray.direction
    if (mode === 'unroll') {
      if (Math.abs(d.z) < 1e-6) return null
      const t = (DIM.R - o.z) / d.z, x = o.x + d.x * t, y = o.y + d.y * t, u = x / DIM.L + 0.5, v = y / (Math.PI * 2 * DIM.R) + 0.5
      return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, hour: v * 12 } : null
    }
    const a = d.y * d.y + d.z * d.z, b = 2 * (o.y * d.y + o.z * d.z), c = o.y * o.y + o.z * o.z - DIM.R * DIM.R, disc = b * b - 4 * a * c
    if (a < 1e-9 || disc < 0) return null
    for (const t of [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)]) {
      if (t < 0) continue
      const p = o.clone().addScaledVector(d, t), u = p.x / DIM.L + 0.5
      if (u < 0 || u > 1 || (mode === 'section' && u > uniforms.uCut.value)) continue
      const angle = Math.atan2(p.z, -p.y)
      return { u, hour: ((angle / (Math.PI * 2) + 0.5) * 12 + 12) % 12 }
    }
    return null
  }
  canvas.addEventListener('pointerdown', (event) => { const hit = pick(event); if (hit) onPick({ meters: hit.u * pipeline.lengthM, hour: hit.hour }) }, options)
  canvas.addEventListener('pointermove', (event) => { const hit = mode === 'section' ? null : pick(event); uniforms.uHover.value = hit ? hit.u : -1; canvas.style.cursor = hit ? 'crosshair' : 'default'; request() }, options)
  canvas.addEventListener('pointerleave', () => { uniforms.uHover.value = -1; request() }, options)
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stopped = true; cancelAnimationFrame(frame); onFailure('WebGL context lost') }, options)
  document.addEventListener('visibilitychange', request, options)
  const project = (point) => { const p = point.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height, visible: p.z < 1 } }
  const api = {
    setData(data) {
      pipeline = data; texture?.dispose()
      const field = fieldData(data)
      texture = new DataTexture(field.data, field.width, field.height)
      texture.magFilter = texture.minFilter = LinearFilter; texture.wrapS = ClampToEdgeWrapping; texture.wrapT = RepeatWrapping; texture.needsUpdate = true
      uniforms.uField.value = texture; uniforms.uTexScale.value = data.lengthM / (10 * field.width); uniforms.uLength.value = data.lengthM
      selected = Math.min(selected, data.segments.length - 1); this.select(selected, true)
    },
    select(id, instant = false) {
      if (!pipeline?.segments[id]) return
      const moved = id !== selected; selected = id
      const [start, end] = span()
      uniforms.uSel.value = (start + end) / 2; uniforms.uHalf.value = (end - start) / 2
      buildCap()
      if (mode === 'section' && (moved || instant)) go(instant ? 0 : DURATION.move)
      request()
    },
    setMode(next, instant = false) { if (next === mode && !instant) return; mode = next; go(instant ? 0 : DURATION[next]) },
    setTheme(theme) {
      const light = theme === 'light'
      const [steel, rust, amber] = wallStops()
      uniforms.uSteel.value.set(...steel); uniforms.uRust.value.set(...rust); uniforms.uAmber.value.set(...amber)
      uniforms.uInside.value.copy(raw('--crude-pitch')); uniforms.uMark.value.copy(raw('--text-primary')); uniforms.uGrid.value.copy(raw('--text-primary'))
      uniforms.uAmbient.value = light ? 0.72 : 0.34; uniforms.uSpec.value = light ? 0.16 : 0.85
      uniforms.uEnv.value = studio.cube(light); uniforms.uEnvPower.value = light ? 0.55 : 1; outlineMax = light ? 1 : 0.28
      props.setTheme(light, raw)
      capUniforms.uPaper.value.copy(raw('--surface-raised')); capUniforms.uInk.value.copy(raw('--drawing-line')); capUniforms.uDrawing.value = light ? 1 : 0
      oilUniforms.uCrude.value.copy(light ? raw('--surface-sunken') : raw('--crude-pitch')); oilUniforms.uSheen.value.copy(raw('--crude-amber'))
      for (const line of outline) line.material.color.copy(token('--drawing-contour'))
      request()
    },
    resize(w, h, isWide) { width = Math.max(1, w); height = Math.max(1, h); wide = isWide; renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(width, height, false); flight.size(width, height); go(0) },
    state() {
      if (!pipeline?.segments[selected]) return null
      const [start, end] = span(), u = (start + end) / 2, t = uniforms.uUnroll.value
      const sheet = layout ? [project(hourPoint(0, 0, 1)), project(hourPoint(1, 12, 1))] : null
      return { mode, moving: flight.moving, unroll: t, cap: capUniforms.uOpacity.value, project, point: (hour, uu = u) => project(hourPoint(uu, hour, t)), capPoint: (hour, mm) => project(hourPoint(end, hour, 0, DIM.R - mm * DIM.R * 0.28 / pipeline.nominalMm).setX((end - 0.5) * DIM.L + 0.002)), sheet }
    },
    stats() { return { mode, selected, unroll: uniforms.uUnroll.value, cut: uniforms.uCut.value, moving: flight.moving } },
    dispose() { stopped = true; cancelAnimationFrame(frame); events.abort(); texture?.dispose(); props.dispose(); studio.dispose(); disposeTextures(textures); for (const o of [wall, cap, oil, ...outline]) { o.geometry.dispose(); o.material.dispose() } renderer.dispose() },
  }
  return api
}
