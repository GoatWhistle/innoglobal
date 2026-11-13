import { Color, MeshPhysicalMaterial } from "three"
import { DIM, LENGTH, toS } from "./route.js"

const SPEED = 0.28
const BORE = DIM.steel - DIM.wall - 0.004

const TRACERS = `
  float tracerLane(float r, float lane, float phase) {
    float width = 0.0055;
    float line = smoothstep(width, width * 0.35, abs(r - lane * ${BORE.toFixed(4)}));
    float profile = pow(max(0.02, 1.0 - lane), 0.16);
    float run = (vOilUv.x - phase * profile + lane * 1.7) / 0.62;
    float f = fract(run);
    float dash = smoothstep(0.0, 0.18, f) * smoothstep(0.62, 0.34, f);
    return line * dash;
  }`

function material(flat) {
  return new MeshPhysicalMaterial({
    color: new Color(0x15120f), roughness: flat ? 0.22 : 0.16, metalness: 0, ior: 1.5,
    clearcoat: flat ? 0 : 0.6, clearcoatRoughness: 0.12, envMapIntensity: flat ? 0.3 : 0.9, specularIntensity: flat ? 0.45 : 1,
  })
}

export function createOil() {
  const uniforms = { uPhaseUp: { value: 0 }, uPhaseDown: { value: 0 }, uLeakS: { value: 1e4 }, uTracer: { value: new Color(0x77736c) }, uTracerAlpha: { value: 0.32 } }
  const body = material()
  body.customProgramCacheKey = () => "pipeline-oil-body"
  const section = material(true)
  section.customProgramCacheKey = () => "pipeline-oil-section"
  section.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `attribute vec3 aFlow; varying vec2 vOilUv; varying float vAcross;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nvOilUv = uv; vAcross = 1.0 - abs(dot(normal, aFlow));")
    shader.fragmentShader = `uniform float uPhaseUp; uniform float uPhaseDown; uniform float uLeakS; uniform vec3 uTracer; uniform float uTracerAlpha;
      varying vec2 vOilUv; varying float vAcross;\n${TRACERS}\n${shader.fragmentShader}`.replace(
      "#include <color_fragment>", `#include <color_fragment>
      float tracerPhase = vOilUv.x < uLeakS ? uPhaseUp : uPhaseDown;
      float tracer = 0.0;
      for (int i = 1; i <= 4; i++) tracer = max(tracer, tracerLane(vOilUv.y, float(i) * 0.2, tracerPhase));
      float tracerEnd = smoothstep(0.0, 0.25, abs(vOilUv.x - uLeakS));
      diffuseColor.rgb = mix(diffuseColor.rgb, uTracer, tracer * uTracerAlpha * step(0.5, vAcross) * tracerEnd);`)
  }
  let up = 0, down = 0, rate = 0
  return {
    body, section, uniforms,
    update(dt, sim, frozen, flow = 1) {
      const [before, after] = sim.flowShare?.() ?? [1, 1]
      const target = frozen ? 0 : flow
      rate += (target - rate) * Math.min(1, dt * 2.5)
      up += dt * SPEED * before * rate; down += dt * SPEED * after * rate
      uniforms.uPhaseUp.value = up
      uniforms.uPhaseDown.value = down
      uniforms.uLeakS.value = sim.leak ? toS(sim.leak.x) * LENGTH : 1e4
    },
    setTheme(light) {
      uniforms.uTracer.value.set(light ? 0x8a8378 : 0x77736c)
      uniforms.uTracerAlpha.value = light ? 0.4 : 0.32
    },
    dispose() { body.dispose(); section.dispose() },
  }
}
