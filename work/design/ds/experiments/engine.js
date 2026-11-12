import { DirectionalLight, HemisphereLight, ACESFilmicToneMapping, Box3, Color, Mesh, MeshBasicMaterial, PerspectiveCamera, RingGeometry, Scene, Vector3, WebGLRenderer } from "three"
import { buildObject } from "./geometry.js"
import { createJet } from "./jet.js"
import { toMeters } from "./paths.js"
import { createStudio } from "./studio.js"

export function createEngine(canvas, sim, overlay, fail) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false })
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.debug.onShaderError = () => { throw new Error("Experiment shader compilation failed") }
  const scene = new Scene()
  const fill = new HemisphereLight(0xd4cbbb, 0x24201b, 1.6)
  const key = new DirectionalLight(0xe7dfd2, 1.2)
  key.position.set(-3, 8, 5)
  scene.add(fill, key)
  const camera = new PerspectiveCamera(30, 1, 0.1, 500)
  const studio = createStudio(renderer)
  const aim = new Mesh(new RingGeometry(0.13, 0.15, 40), new MeshBasicMaterial({ color: 0xe9e6df, depthTest: false, transparent: true }))
  scene.add(aim)
  aim.visible = false
  let object = null, jet = null, jetKey = null, resetAt = null
  let id = "sculpture", light = false, clock = 0, last = performance.now(), changed = last
  let width = 1, height = 1, stopped = false, frameId = 0
  let dpr = Math.min(devicePixelRatio, innerWidth < 768 ? 1 : 1.5)
  let frames = [], costs = [], lastQuality = 0
  let labelTime = null, overlayDirty = true
  let renderedFrames = 0
  const reduced = matchMedia("(prefers-reduced-motion: reduce)")
  const pickPoint = new Vector3()
  function fit() {
    if (!object) return
    overlayDirty = true
    const bounds = new Box3().setFromObject(object.group)
    const center = bounds.getCenter(new Vector3()).add(new Vector3(0, -object.config.radius * 0.65, 0))
    const direction = new Vector3(...object.config.camera).normalize()
    const right = new Vector3(0, 1, 0).cross(direction).normalize()
    const up = direction.clone().cross(right).normalize()
    const positions = object.body.geometry.attributes.position
    const tan = Math.tan(camera.fov * Math.PI / 360)
    let distance = 0
    const p = new Vector3()
    for (let i = 0; i < positions.count; i += 4) {
      p.fromBufferAttribute(positions, i).sub(center)
      const depth = p.dot(direction)
      distance = Math.max(distance, Math.abs(p.dot(right)) / (tan * width / height) + depth, (Math.abs(p.dot(up)) + object.config.radius * 0.4) / tan + depth)
    }
    camera.position.copy(direction.multiplyScalar(distance * 1.06).add(center))
    camera.lookAt(center)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  function theme(next) {
    light = next === "light"
    const style = getComputedStyle(document.documentElement)
    scene.background = new Color(style.getPropertyValue("--surface-base").trim())
    scene.environment = studio.get(light)
    aim.material.color.set(light ? 0x242220 : 0xe9e6df)
    if (object) {
      object.shell.material.color.set(light ? 0x393530 : 0x242220)
      object.oil.material.envMapIntensity = light ? 0.9 : 1.15
    }
  }
  function discardJet() {
    if (!jet) return
    scene.remove(jet.group)
    jet.dispose()
    jet = null
  }
  function setVariant(next) {
    discardJet()
    if (object) { scene.remove(object.group); object.dispose() }
    id = next
    object = buildObject(id)
    scene.add(object.group)
    jetKey = null
    resetAt = null
    frames = []; costs = []; changed = performance.now()
    aim.visible = false
    fit(); theme(light ? "light" : "dark")
  }
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    fit()
  }
  function project(m, offset = 0) {
    const surface = object.surface(m, camera)
    pickPoint.copy(surface.position).project(camera)
    return { x: (pickPoint.x * 0.5 + 0.5) * width, y: (-pickPoint.y * 0.5 + 0.5) * height + offset }
  }
  function update(dt) {
    object.oil.uniforms.uTime.value = clock
    for (const [i, sensor] of (sim.sensors ?? []).entries()) {
      const ring = object.sensors[i]
      ring.material.color.set(sensor.state === 2 ? light ? 0x9a352b : 0xe76f5d : sensor.state === 1 ? light ? 0x996200 : 0xd2a363 : light ? 0x797168 : 0x69645d)
    }
    if (sim.leak && sim.leak.t0 !== jetKey) {
      discardJet()
      const surface = object.surface(sim.leak.x, camera)
      jet = createJet(surface.position, surface.normal, object.config.radius)
      scene.add(jet.group)
      object.shell.uniforms.uHole.value.copy(surface.position)
      jetKey = sim.leak.t0; resetAt = null
    }
    if (!sim.leak && jetKey !== null && resetAt === null) {
      resetAt = performance.now()
      object.shell.uniforms.uHole.value.set(1e4, 0, 0)
    }
    let fade = 1
    if (resetAt !== null) fade = reduced.matches ? 0 : Math.max(0, 1 - (performance.now() - resetAt) / 800)
    if (jet) jet.update(clock, sim.age, fade, reduced.matches)
    if (fade === 0) { discardJet(); jetKey = null; resetAt = null }
    if (overlayDirty || labelTime !== sim.time) {
      overlay({ project, sim, reduced: reduced.matches })
      labelTime = sim.time; overlayDirty = false
    }
  }
  function tick(now) {
    if (stopped) return
    const dt = Math.min((now - last) / 1000, 0.05)
    const interval = now - last
    last = now
    if (!document.hidden && object) {
      try {
        if (!reduced.matches) clock += dt
        const begin = performance.now()
        update(dt)
        renderer.render(scene, camera)
        renderedFrames++
        if (now - changed > 1000 && interval < 250) {
          frames.push(interval); costs.push(performance.now() - begin)
          if (frames.length > 600) { frames.shift(); costs.shift() }
        }
        if (now - lastQuality > 3000 && frames.length > 60) {
          lastQuality = now
          if (percentile(frames, 0.95) > 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); resize(width, height) }
        }
      } catch (error) { stopped = true; fail(error.message) }
    }
    frameId = requestAnimationFrame(tick)
  }
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stopped = true; cancelAnimationFrame(frameId); fail("WebGL context lost") })
  frameId = requestAnimationFrame(tick)
  return {
    setVariant, setTheme: theme, resize, project,
    pick(hit) {
      return hit?.uv ? toMeters(hit.uv.x) : null
    },
    get targets() { return object ? [object.body, object.liquid] : [] },
    get camera() { return camera },
    hover(m) {
      aim.visible = m !== null && !sim.leak
      if (m === null) return
      const surface = object.surface(m, camera)
      aim.position.copy(surface.position).addScaledVector(surface.normal, 0.025)
      aim.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), surface.normal)
    },
    stats() { return { variant: id, samples: frames.length, median: percentile(frames, 0.5), p95: percentile(frames, 0.95), render: percentile(costs, 0.95), dpr, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, simulationTime: sim.time, visualTime: clock, renderedFrames, reducedMotion: reduced.matches } },
    dispose() {
      stopped = true; cancelAnimationFrame(frameId); discardJet(); object?.dispose()
      aim.geometry.dispose(); aim.material.dispose(); studio.dispose(); renderer.dispose()
    },
  }
}

function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}
