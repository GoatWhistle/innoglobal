import {
  BufferAttribute,
  CatmullRomCurve3,
  CylinderGeometry,
  Mesh,
  MeshPhysicalMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three"
import { HALF } from "./layout.js"
import { NOISE } from "./noise.js"

const TUBE = 64
const RADIAL = 12

function oilMaterial(key, uniforms, normalCode, vertex = "") {
  const material = new MeshPhysicalMaterial({
    color: 0x050403,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    sheen: 0.6,
    sheenRoughness: 0.4,
  })
  material.customProgramCacheKey = () => key
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `
      uniform float uTime;
      uniform float uFade;
      attribute float aRadius;
      varying vec3 vWorldP;
      varying vec2 vOilUv;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vOilUv = uv;
      ${vertex}
      vWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    )
    shader.fragmentShader = `
      uniform float uTime;
      uniform float uBump;
      uniform float uGrow;
      uniform float uRadius;
      uniform vec3 uFlow;
      varying vec3 vWorldP;
      varying vec2 vOilUv;
      ${NOISE}
      ${shader.fragmentShader}
    `
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vOilUv.x > uGrow) discard;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
${normalCode}`)
      .replace(
        "#include <clearcoat_normal_fragment_maps>",
        "#include <clearcoat_normal_fragment_maps>\nclearcoatNormal = normal;",
      )
  }
  return material
}

export function createOil() {
  const shared = {
    uTime: { value: 0 },
    uRadius: { value: 0.5 },
    uFlow: { value: new Vector3() },
  }
  const coreUniforms = { ...shared, uBump: { value: 0.14 }, uGrow: { value: 2 }, uFade: { value: 1 } }
  const coreMaterial = oilMaterial("oil-core", coreUniforms, "normal = oilCoreNormal();")
  const coreHook = coreMaterial.onBeforeCompile
  coreMaterial.onBeforeCompile = (shader) => {
    coreHook(shader)
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `float oilHeight(float u, float th) {
        float a = snoise(vec3(u * 0.22 / uRadius, th * 0.5, uTime * 0.08));
        float b = snoise(vec3(u * 0.7 / uRadius, th * 0.9, uTime * 0.15));
        return a * 0.8 + b * 0.2;
      }
      vec3 oilCoreNormal() {
        float th = atan(vWorldP.y - uRadius, vWorldP.z);
        float u = vWorldP.x - (vWorldP.x < uFlow.z ? uFlow.x : uFlow.y);
        float e = 0.02;
        float h = oilHeight(u, th);
        float du = (oilHeight(u + e * uRadius, th) - h) / e;
        float dt = (oilHeight(u, th + e) - h) / e;
        vec3 n = vec3(0.0, sin(th), cos(th));
        vec3 b = vec3(0.0, cos(th), -sin(th));
        vec3 w = normalize(n - (vec3(1.0, 0.0, 0.0) * du + b * dt * 0.35) * uBump);
        return normalize((viewMatrix * vec4(w, 0.0)).xyz);
      }
      void main() {`,
    )
  }
  const coreGeometry = new CylinderGeometry(0.93, 0.93, HALF * 2 + 0.6, 128, 1, true)
  coreGeometry.rotateZ(Math.PI / 2)
  coreGeometry.setAttribute("aRadius", new BufferAttribute(new Float32Array(coreGeometry.attributes.position.count), 1))
  const core = new Mesh(coreGeometry, coreMaterial)

  const streamUniforms = { ...shared, uBump: { value: 0 }, uGrow: { value: 0 }, uFade: { value: 1 } }
  const streamMaterial = oilMaterial(
    "oil-stream",
    streamUniforms,
    "",
    `float pulse = sin(uv.x * 22.0 - uTime * 7.0) * 0.16 + sin(uv.x * 47.0 - uTime * 11.0) * 0.06;
     transformed += objectNormal * aRadius * (pulse - (1.0 - uFade));`,
  )
  const stream = new Mesh(undefined, streamMaterial)
  stream.visible = false
  stream.frustumCulled = false

  return {
    core,
    stream,
    shared,
    streamUniforms,
    setRadius(radius) {
      shared.uRadius.value = radius
      core.scale.set(1, radius, radius)
      core.position.y = radius
    },
    setTheme({ colors, dark }) {
      for (const m of [coreMaterial, streamMaterial]) {
        m.color.copy(colors.crude)
        m.sheenColor.copy(colors.deep).multiplyScalar(dark ? 0.5 : 0.35)
        m.envMapIntensity = dark ? 1 : 0.4
      }
    },
    pour(hole, normal, radius) {
      const speed = 2.1 * Math.sqrt(radius / 0.52)
      const gravity = 9.5 * (radius / 0.52)
      const vy = normal.y * speed
      const land = (vy + Math.sqrt(vy * vy + 2 * gravity * (hole.y + 0.02))) / gravity
      const points = []
      for (let i = 0; i <= 24; i++) {
        const t = (i / 24) * land
        points.push(new Vector3(hole.x, hole.y + vy * t - (gravity * t * t) / 2, hole.z + normal.z * speed * t))
      }
      const curve = new CatmullRomCurve3(points)
      const geometry = new TubeGeometry(curve, TUBE, 1, RADIAL, false)
      const position = geometry.attributes.position
      const radii = new Float32Array(position.count)
      const center = new Vector3()
      const p = new Vector3()
      const base = radius * 0.12
      for (let i = 0; i <= TUBE; i++) {
        const s = i / TUBE
        curve.getPointAt(s, center)
        const r = base * (1 - 0.42 * Math.sqrt(s)) * (1 + 0.5 * Math.exp(-s * 40))
        for (let j = 0; j <= RADIAL; j++) {
          const k = i * (RADIAL + 1) + j
          p.fromBufferAttribute(position, k).sub(center).multiplyScalar(r).add(center)
          position.setXYZ(k, p.x, p.y, p.z)
          radii[k] = r
        }
      }
      geometry.setAttribute("aRadius", new BufferAttribute(radii, 1))
      geometry.computeVertexNormals()
      stream.geometry?.dispose()
      stream.geometry = geometry
      stream.visible = true
      streamUniforms.uGrow.value = 0
      streamUniforms.uFade.value = 1
      return new Vector2(hole.x, points[points.length - 1].z)
    },
    update(time, flowUp, flowDown, leakX, age, fade) {
      shared.uTime.value = time
      shared.uFlow.value.set(flowUp, flowDown, leakX)
      if (!stream.visible) return
      streamUniforms.uGrow.value = age < 0 ? 1.01 : Math.min(age / 0.45, 1.01)
      streamUniforms.uFade.value = fade
      if (fade <= 0.001) stream.visible = false
    },
    clear() {
      stream.visible = false
    },
  }
}
