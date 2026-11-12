import { ACESFilmicToneMapping, VSMShadowMap, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, RingGeometry, Scene, TorusGeometry, Vector3, WebGLRenderer } from "three"
import { buildFittings } from "./fittings.js"
import { createFluid } from "./fluid.js"
import { createGround, createPuddle } from "./ground.js"
import { createJet } from "./jet.js"
import { createLeak } from "./leak.js"
import { createOil } from "./oil.js"
import { buildPipe } from "./pipe.js"
import { createRig } from "./rig.js"
import { frame, nearestS, outerRadius, radial, surface, toMeters, toS } from "./route.js"
import { createStudio } from "./studio.js"
import { createSurfaces } from "./surface.js"
import { createTextures, disposeTextures } from "./textures.js"

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export function createEngine(canvas, sim, overlay, fail) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" })
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = VSMShadowMap
  renderer.debug.onShaderError = () => { throw new Error("Pipeline shader compilation failed") }
  const scene = new Scene()
  const camera = new PerspectiveCamera(26, 1, 0.5, 200)
  const fill = new HemisphereLight(0xd9d2c4, 0x1c1915, 0.5)
  const key = new DirectionalLight(0xfff4e2, 3.1)
  key.position.set(-3.5, 14, -2.2)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -13, right: 13, top: 9, bottom: -9, near: 1, far: 40 })
  key.shadow.bias = -0.0002
  key.shadow.normalBias = 0.03
  key.shadow.radius = 9
  key.shadow.blurSamples = 16
  scene.add(fill, key, key.target)
  const lightDirection = key.position.clone().normalize()
  const studio = createStudio(renderer)
  const textures = createTextures()
  const surfaces = createSurfaces(textures)
  const oil = createOil()
  const pipe = buildPipe(surfaces, oil)
  const fittings = buildFittings(surfaces)
  const ground = createGround(textures)
  const puddle = createPuddle()
  const jet = createJet()
  const fluid = createFluid(renderer, jet.geometry)
  const rig = createRig(camera)
  const leak = createLeak({ surfaces, jet, puddle, rig })
  const aim = new Mesh(new RingGeometry(0.105, 0.125, 48), new MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }))
  aim.visible = false
  aim.renderOrder = 5
  const fronts = [0, 1].map(() => {
    const ring = new Mesh(new TorusGeometry(1, 0.008, 8, 96), new MeshBasicMaterial({ transparent: true, opacity: 0 }))
    ring.visible = false
    return ring
  })
  scene.add(pipe.group, fittings.group, ground.mesh, puddle.mesh, aim, ...fronts)
  const tones = { neutral: new Color(), warning: new Color(), danger: new Color(), dark: new Color(0x000000) }
  const forced = new URLSearchParams(location.search).get("motion") === "reduce"
  const media = matchMedia("(prefers-reduced-motion: reduce)")
  const reduced = { get matches() { return forced || media.matches } }
  const projected = new Vector3(), forward = new Vector3(0, 0, 1)
  let light = false, clock = 0, wall = 0, last = performance.now(), changed = last
  let width = 1, height = 1, stopped = false, frameId = 0, rendered = 0, lastQuality = 0, labelTime = null
  let dpr = Math.min(devicePixelRatio, innerWidth < 768 ? 1.25 : 1.75)
  let frames = [], costs = []
  function theme(next) {
    light = next === "light"
    scene.background = new Color(token("--surface-base"))
    scene.environment = studio.environment(light)
    scene.environmentIntensity = light ? 0.9 : 1
    fluid.setEnvironment(studio.cube(light))
    ground.setTheme(light)
    fill.intensity = light ? 1.1 : 0.5
    key.intensity = light ? 2.3 : 3.1
    tones.neutral.set(token("--status-neutral")); tones.warning.set(token("--status-warning")); tones.danger.set(token("--status-danger"))
    aim.material.color.set(token("--text-primary"))
    for (const ring of fronts) ring.material.color.copy(tones.warning)
  }
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    rig.fit(width, height)
    labelTime = null
  }
  function place(point) {
    projected.copy(point).project(camera)
    return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height }
  }
  function project(meters, anchor = "front") {
    if (anchor === "front") return place(surface(meters).position)
    const s = toS(meters), f = frame(s)
    return place(f.center.clone().addScaledVector(radial(f, anchor === "top" ? 0 : 1.05), outerRadius(s) + (anchor === "top" ? 0.74 : 0.02)))
  }
  function update(dt) {
    oil.uniforms.uTime.value = clock
    oil.uniforms.uSpeed.value = sim.leak ? 0.82 : 1
    for (const [i, sensor] of (sim.sensors ?? []).entries()) {
      const tone = sensor.state === 2 ? tones.danger : sensor.state === 1 ? tones.warning : tones.neutral
      const unit = fittings.sensors[i]
      unit.status.color.copy(tone)
      unit.status.emissive.copy(sensor.state ? tone : tones.dark)
      unit.status.emissiveIntensity = 0.85
    }
    leak.update(sim, wall, clock, dt, reduced.matches)
    const wave = sim.fronts()
    fronts.forEach((ring, i) => {
      const front = wave?.[i]
      ring.visible = Boolean(front) && front.x > 0 && front.x < 12000 && !sim.detection
      if (!ring.visible) return
      const s = toS(front.x), f = frame(s)
      ring.position.copy(f.center)
      ring.quaternion.setFromUnitVectors(forward, f.tangent)
      ring.scale.setScalar(outerRadius(s) + 0.04)
      ring.material.opacity = 0.35 + 0.65 * front.strength
    })
  }
  function tick(now) {
    if (stopped) return
    const interval = now - last
    const dt = Math.min(interval / 1000, 0.05)
    last = now
    if (!document.hidden) {
      try {
        wall += dt
        if (!reduced.matches) clock += dt
        const begin = performance.now()
        const moved = rig.update(dt, clock, reduced.matches)
        update(dt)
        if (moved || labelTime !== sim.time) { overlay({ project, sim }); labelTime = sim.time }
        renderer.render(scene, camera)
        if (jet.alive > 0) fluid.render(camera, lightDirection, camera.position.length(), 1)
        rendered++
        if (now - changed > 1500 && interval < 250) {
          frames.push(interval); costs.push(performance.now() - begin)
          if (frames.length > 600) { frames.shift(); costs.shift() }
        }
        if (now - lastQuality > 3000 && frames.length > 90) {
          lastQuality = now
          if (percentile(frames, 0.95) > 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); frames = []; costs = []; resize(width, height) }
        }
      } catch (error) { stopped = true; fail(error.message) }
    }
    frameId = requestAnimationFrame(tick)
  }
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stopped = true; cancelAnimationFrame(frameId); fail("WebGL context lost") })
  frameId = requestAnimationFrame(tick)
  return {
    setTheme: theme, resize, project, camera,
    targets: pipe.targets,
    orbit: rig.orbit, home: rig.home,
    pick: (hit) => hit ? toMeters(nearestS(hit.point)) : null,
    hover(meters) {
      aim.visible = meters !== null && !sim.leak
      if (!aim.visible) return
      const at = surface(meters)
      aim.position.copy(at.position).addScaledVector(at.normal, 0.02)
      aim.quaternion.setFromUnitVectors(forward, at.normal)
    },
    stats() {
      return { samples: frames.length, median: percentile(frames, 0.5), p95: percentile(frames, 0.95), render: percentile(costs, 0.95), dpr, particles: jet.alive, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, simulationTime: sim.time, visualTime: clock, rendered, reducedMotion: reduced.matches }
    },
    dispose() {
      stopped = true; cancelAnimationFrame(frameId)
      for (const part of [pipe, fittings, ground, puddle, jet, fluid, surfaces, studio]) part.dispose()
      oil.material.dispose(); disposeTextures(textures)
      aim.geometry.dispose(); aim.material.dispose()
      for (const ring of fronts) { ring.geometry.dispose(); ring.material.dispose() }
      renderer.dispose()
    },
  }
}

function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}
