import { NeutralToneMapping, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from "three"
import { createBackdrop } from "./backdrop.js"
import { createCurtain } from "./curtain.js"
import { createStudio } from "./env.js"
import { createGround } from "./ground.js"
import { createInput, frontNormal, frontPoint } from "./input.js"
import { frameFor, HALF, toMeters, toWorld } from "./layout.js"
import { createOil } from "./oil.js"
import { createPipe } from "./pipe.js"
import { createPost } from "./post.js"
import { createRig } from "./rig.js"
import { SEGMENT_M } from "./sim.js"

const OIL_RATE = 4.5

export function createWorld({ canvas, sim, ease }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" })
  renderer.debug.onShaderError = () => { throw new Error("Scene shader compilation failed") }
  renderer.toneMapping = NeutralToneMapping
  const scene = new Scene()
  const camera = new PerspectiveCamera(20, 1, 1, 600)
  const rig = createRig(camera)
  const studio = createStudio(renderer)
  const pipe = createPipe()
  const curtain = createCurtain()
  const ground = createGround()
  const oil = createOil()
  const backdrop = createBackdrop(ground.uniforms)
  scene.add(pipe.group, oil.core, oil.stream)
  const post = createPost(renderer, scene, camera)
  let frame = frameFor(1, 1)
  const input = createInput({
    canvas,
    camera,
    targets: () => [pipe.shell, oil.core, ...pipe.collars],
    radius: () => frame.radius,
  })
  const parallax = new Vector2()
  const flow = { up: 0, down: 0 }
  const fades = { confirm: 0, detect: 0, stain: 1 }
  let resetAt = null
  let size = { w: 1, h: 1 }

  return {
    setCutaway(on) {
      pipe.uniforms.uWindow.value.set(...(on ? [-0.12, 0.82] : [4, 5]))
    },
    camera,
    rig,
    input,
    get frame() {
      return frame
    },
    applyTheme(theme) {
      scene.environment = studio.get(theme.dark, theme.colors)
      renderer.setClearColor(theme.colors.void, 1)
      for (const part of [pipe, oil, curtain, ground, post]) part.setTheme(theme)
    },
    resize(w, h) {
      size = { w, h }
      const ratio = Math.min(devicePixelRatio, 1.75)
      renderer.setPixelRatio(ratio)
      renderer.setSize(w, h, false)
      frame = { ...frameFor(w, h), topRow: 0.48, radius: 1.05, yaw: -0.12, margin: Math.min(64, w * 0.1) }
      camera.aspect = w / h
      camera.fov = frame.fov
      pipe.setRadius(frame.radius)
      oil.setRadius(frame.radius)
      curtain.layout(frame.radius, frame.gap, frame.height)
      rig.fit(frame, w, h, frame.radius * 2, frame.radius)
      ground.uniforms.uRadius.value = frame.radius
      ground.uniforms.uStain.value = frame.stain
      post.setSize(w, h, ratio)
    },
    pick(event) {
      const point = input.pick(event)
      return point ? toMeters(point.x) : null
    },
    insert(meters) {
      const point = frontPoint(toWorld(meters), frame.radius)
      pipe.uniforms.uHole.value.copy(point)
      pipe.uniforms.uHoleAge.value = 0
      ground.uniforms.uLeak.value.copy(oil.pour(point, frontNormal(), frame.radius))
      ground.uniforms.uAge.value = 0
      fades.stain = 1
      pipe.uniforms.uFade.value = 1
      resetAt = null
    },
    reset(clock) {
      resetAt = null
      pipe.uniforms.uHoleAge.value = -1
      fades.stain = 0
      oil.clear()
    },
    update({ clock, dt, reduced, hover, durations }) {
      const calm = reduced ? 0 : 1
      parallax.set(0, 0)
      const sway = 0
      const yaw = rig.orbit(clock, reduced ? 1e-3 : durations.long, ease)
      rig.aim(frame, size.w, size.h, frame.yaw + yaw + sway + parallax.x * 0.025, parallax.y * 0.01)

      const intro = reduced ? 1 : ease(Math.min(Math.max((clock - 0.2) / (durations.long * 1.6), 0), 1))
      curtain.write(sim.model, sim.measured, intro)
      const [upShare, downShare] = sim.flowShare()
      const speed = reduced ? 0 : 0.55
      flow.up += dt * speed * upShare
      flow.down += dt * speed * downShare
      const leakX = sim.leak ? toWorld(sim.leak.x) : HALF * 4
      const found = sim.detection
      fades.confirm += ((found ? 1 : 0) - fades.confirm) * (reduced ? 1 : Math.min(dt * 3, 1))
      fades.detect = found ? 1 : 0

      const hx = toWorld(hover.m)
      const fu = curtain.uniforms
      fu.uTime.value = clock
      fu.uFlow.value.set(flow.up, flow.down, leakX)
      fu.uHover.value.set(hx, hover.on)
      fu.uConfirm.value = fades.confirm
      fu.uStates.value = sim.sensors.map((s, i) => pipe.collars[i].userData.level)
      const fronts = sim.fronts()
      if (fronts) {
        const fade = Math.max(0, 1 - Math.max(sim.age - 9, 0) / 2)
        fu.uFront.value.set(toWorld(fronts[0].x), fronts[0].strength * fade, toWorld(fronts[1].x), fronts[1].strength * fade)
      } else fu.uFront.value.set(0, 0, 0, 0)
      pipe.uniforms.uFront.value.copy(fu.uFront.value)
      if (found) {
        const k = ease(fades.detect)
        fu.uDetect.value.set(toWorld(found.x), (found.spread / SEGMENT_M) * HALF * 2, k)
        pipe.uniforms.uMark.value.set(toWorld(found.x), k)
      } else {
        fu.uDetect.value.z = fades.detect
        pipe.uniforms.uMark.value.y = fades.detect
      }
      pipe.uniforms.uHover.value.set(hx, hover.on)
      pipe.setSensors(sim.sensors, reduced ? 1 : dt)
      ground.uniforms.uTime.value = clock * (calm || 0.2)

      if (sim.leak) {
        pipe.uniforms.uHoleAge.value = sim.age
        ground.uniforms.uAge.value = sim.age
      } else if (resetAt !== null) {
        const k = Math.min((clock - resetAt) / durations.long, 1)
        fades.stain = 1 - ease(k)
        pipe.uniforms.uFade.value = fades.stain
        if (k >= 1) {
          pipe.uniforms.uHoleAge.value = -1
          ground.uniforms.uAge.value = -1
          resetAt = null
        }
      }
      ground.uniforms.uFade.value = fades.stain
      oil.update(clock * (reduced ? 0.2 : 1), flow.up * OIL_RATE, flow.down * OIL_RATE, leakX, sim.leak ? sim.age : -1, fades.stain)
    },
    labels(overlay, hover) {
      const h = { x: toWorld(hover.m), on: hover.on }
      overlay.layout({ camera, width: size.w, height: size.h, radius: frame.radius, curtain, sim, hover: h, toWorld, toMeters, half: HALF })
    },
    render(clock) {
      renderer.render(scene, camera)
    },
  }
}
