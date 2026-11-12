import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  Vector4,
} from "three"
import { HALF, toWorld } from "./layout.js"
import { SENSORS_M } from "./sim.js"

const LENGTH = 90
export const WINDOW = [-0.12, 0.82]
export const HOLE_ANGLE = -0.5

const HEAD = `
uniform vec3 uHole;
uniform float uHoleAge;
uniform float uFade;
uniform float uRadius;
uniform float uHalf;
uniform vec2 uWindow;
uniform vec4 uFront;
uniform vec2 uHover;
uniform vec2 uMark;
uniform float uDark;
uniform vec3 uWarm;
uniform vec3 uSteel;
uniform vec3 uInk;
uniform vec3 uDanger;
varying vec3 vWorldP;
float holeLip;
float cutEdge;
`

const SHELL = `
{
  float th = atan(vWorldP.y - uRadius, vWorldP.z);
  float inside = step(abs(vWorldP.x), uHalf);
  float pxa = fwidth(th) * 1.4;
  float pxx = fwidth(vWorldP.x) * 1.4;
  float inWin = inside * step(uWindow.x, th) * step(th, uWindow.y);
  if (inWin > 0.5) discard;
  float edgeA = min(abs(th - uWindow.x), abs(th - uWindow.y)) / max(pxa, 1e-5);
  float edgeX = abs(abs(vWorldP.x) - uHalf) / max(pxx, 1e-5);
  float nearA = step(abs(vWorldP.x), uHalf + pxx);
  float nearX = step(uWindow.x - pxa, th) * step(th, uWindow.y + pxa);
  cutEdge = max((1.0 - smoothstep(0.6, 1.8, edgeA)) * nearA, (1.0 - smoothstep(0.6, 1.8, edgeX)) * nearX);
  if (!gl_FrontFacing) diffuseColor.rgb = uSteel * 0.25;
  diffuseColor.rgb = mix(diffuseColor.rgb, uSteel, cutEdge);
  holeLip = 0.0;
  if (uHoleAge >= 0.0) {
    float phiH = atan(uHole.y - uRadius, uHole.z);
    float dphi = mod(phiH - th + 3.14159265, 6.2831853) - 3.14159265;
    float r = length(vec2(vWorldP.x - uHole.x, dphi * uRadius)) / uRadius;
    float core = (1.0 - smoothstep(0.07, 0.1, r)) * uFade;
    holeLip = smoothstep(0.08, 0.11, r) * (1.0 - smoothstep(0.15, 0.21, r)) * uFade;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), core);
  }
}
`

const EMISSIVE = `
{
  vec3 glow = uSteel * cutEdge * mix(0.15, 0.35, uDark);
  glow += mix(uWarm, uDanger, smoothstep(0.0, 1.5, uHoleAge)) * holeLip * mix(0.9, 1.6, uDark);
  for (int i = 0; i < 2; i++) {
    float fx = i == 0 ? uFront.x : uFront.z;
    float fs = i == 0 ? uFront.y : uFront.w;
    float d = (vWorldP.x - fx) / (uRadius * 0.22);
    glow += uWarm * fs * (exp(-d * d) * 1.6 + exp(-abs(d) * 0.35) * 0.12);
  }
  if (uHoleAge >= 0.0 && uHoleAge < 1.2) {
    float phiH = atan(uHole.y - uRadius, uHole.z);
    float phiW = atan(vWorldP.y - uRadius, vWorldP.z);
    float dphi = mod(phiH - phiW + 3.14159265, 6.2831853) - 3.14159265;
    float r = length(vec2(vWorldP.x - uHole.x, dphi * uRadius));
    float ring = r - uHoleAge * uRadius * 3.2;
    glow += uWarm * exp(-ring * ring / (uRadius * uRadius * 0.004)) * (1.0 - uHoleAge / 1.2) * 1.4;
  }
  float hd = abs(vWorldP.x - uHover.x) / fwidth(vWorldP.x);
  glow += uInk * uHover.y * (1.0 - smoothstep(0.6, 1.6, hd)) * 0.55;
  float md = abs(vWorldP.x - uMark.x) / fwidth(vWorldP.x);
  glow += uDanger * uMark.y * (1.0 - smoothstep(0.8, 2.0, md)) * 1.4;
  if (!gl_FrontFacing) glow *= 0.0;
  totalEmissiveRadiance += glow;
}
`

export function createPipe() {
  const group = new Group()
  const uniforms = {
    uHole: { value: new Vector3(0, -100, 0) },
    uHoleAge: { value: -1 },
    uFade: { value: 1 },
    uRadius: { value: 0.42 },
    uHalf: { value: HALF },
    uWindow: { value: new Vector2(...WINDOW) },
    uFront: { value: new Vector4(0, 0, 0, 0) },
    uHover: { value: new Vector2(0, 0) },
    uMark: { value: new Vector2(0, 0) },
    uDark: { value: 1 },
    uWarm: { value: new Color() },
    uSteel: { value: new Color() },
    uInk: { value: new Color() },
    uDanger: { value: new Color() },
  }

  const material = new MeshPhysicalMaterial({
    color: 0x050505,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: DoubleSide,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `varying vec3 vWorldP;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    )
    shader.fragmentShader = `${HEAD}\n${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>\n${SHELL}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${EMISSIVE}`)
  }

  const body = new CylinderGeometry(1, 1, LENGTH, 160, 1, true)
  body.rotateZ(Math.PI / 2)
  const shell = new Mesh(body, material)
  group.add(shell)

  const collarGeometry = new CylinderGeometry(1.075, 1.075, 1, 96, 1, false)
  collarGeometry.rotateZ(Math.PI / 2)
  const collars = SENSORS_M.map((m) => {
    const mat = new MeshStandardMaterial({ color: 0x9a9a9a, metalness: 1, roughness: 0.32 })
    const mesh = new Mesh(collarGeometry, mat)
    mesh.position.x = toWorld(m)
    mesh.userData.level = 0
    group.add(mesh)
    return mesh
  })

  return {
    group,
    shell,
    collars,
    uniforms,
    setRadius(radius) {
      uniforms.uRadius.value = radius
      shell.scale.set(1, radius, radius)
      shell.position.y = radius
      for (const c of collars) {
        c.scale.set(radius * 0.32, radius, radius)
        c.position.y = radius
      }
    },
    setTheme({ colors, dark }) {
      uniforms.uDark.value = dark ? 1 : 0
      uniforms.uWarm.value.copy(colors.warm)
      uniforms.uSteel.value.copy(colors.steel).multiplyScalar(dark ? 1.4 : 0.9)
      uniforms.uInk.value.copy(dark ? colors.ink : colors.void)
      uniforms.uDanger.value.copy(colors.leak)
      material.color.copy(colors.crude)
      for (const c of collars) c.material.color.copy(colors.steel).multiplyScalar(dark ? 1.6 : 1.1)
      this.colors = colors
      this.dark = dark
    },
    setSensors(sensors, dt) {
      for (const [i, s] of sensors.entries()) {
        const c = collars[i]
        c.userData.level += (s.state - c.userData.level) * Math.min(dt * 6, 1)
        const level = c.userData.level
        const warm = Math.min(level, 1)
        const hot = Math.max(level - 1, 0)
        c.material.emissive.copy(this.colors.warm).multiplyScalar(warm * (1 - hot) * (this.dark ? 0.9 : 0.7))
        c.material.emissive.lerp(this.colors.leak.clone().multiplyScalar(this.dark ? 2 : 0.9), hot)
        c.material.color.copy(this.colors.steel).multiplyScalar((this.dark ? 1.6 : 1.1) * (1 - warm * 0.85))
      }
    },
  }
}
