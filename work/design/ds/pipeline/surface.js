import { MeshPhysicalMaterial, MeshStandardMaterial, Vector2, Vector3 } from "three"
import { NOISE } from "../scene/noise.js"

export function leakUniforms() {
  return {
    uHole: { value: new Vector3(1e4, 0, 0) }, uHoleN: { value: new Vector3(0, 0, 1) }, uHoleT: { value: new Vector3(1, 0, 0) },
    uHoleR: { value: 0.125 }, uWet: { value: 0 }, uWetFade: { value: 1 },
  }
}

const HEAD = `uniform vec3 uHole; uniform vec3 uHoleN; uniform vec3 uHoleT; uniform float uHoleR; uniform float uWet; uniform float uWetFade;
varying vec3 vWorld; float leakWet = 0.0;`

function leaking(material, uniforms, key) {
  material.customProgramCacheKey = () => key
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `varying vec3 vWorld;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;")
    shader.fragmentShader = `${HEAD}\n${NOISE}\n${shader.fragmentShader}`.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      vec3 hd = vWorld - uHole;
      float depth = dot(hd, uHoleN);
      vec3 flat3 = hd - uHoleN * depth;
      float along = dot(flat3, uHoleT);
      float across = dot(flat3, cross(uHoleN, uHoleT));
      float holeAngle = atan(across, along);
      float holeD = length(flat3);
      float ragged = uHoleR * (1.0 + 0.2 * sin(holeAngle * 5.0 + 1.3) + 0.12 * sin(holeAngle * 9.0 + 4.0));
      float near = step(-0.5, depth) * step(depth, 0.2);
      if (near * step(holeD, ragged) > 0.5) discard;
      float below = uHole.y - vWorld.y;
      float wander = snoise(vec3(below * 2.4, uHole.x, 1.0)) * uHoleR * 0.5 * smoothstep(0.0, 0.5, below);
      float width = uHoleR * (1.15 + 0.5 * snoise(vec3(below * 5.0, 3.0, uHole.x)) * smoothstep(0.05, 0.4, below));
      float run = smoothstep(width, width * 0.55, abs(along + wander)) * step(-uHoleR * 0.4, below) * smoothstep(uWet, uWet * 0.8 - 0.02, below);
      float rim = smoothstep(ragged * 2.1, ragged * 1.1, holeD) * smoothstep(0.0, 0.15, uWet);
      leakWet = near * max(run, rim) * uWetFade;`)
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.006, 0.005, 0.004), leakWet);")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.07, leakWet);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, leakWet);")
  }
  return material
}

export function createSurfaces(textures) {
  const uniforms = leakUniforms()
  const scale = (v) => new Vector2(v, v)
  const jacket = leaking(new MeshPhysicalMaterial({
    color: 0xa7a49e, metalness: 1, roughness: 1, normalMap: textures.jacket.normal, normalScale: scale(0.32),
    roughnessMap: textures.jacket.surface, metalnessMap: textures.jacket.surface, envMapIntensity: 1.1,
  }), uniforms, "pipeline-jacket")
  const steel = leaking(new MeshPhysicalMaterial({
    color: 0x8e9094, metalness: 1, roughness: 1, map: textures.steel.color, normalMap: textures.steel.normal, normalScale: scale(0.28),
    roughnessMap: textures.steel.surface, metalnessMap: textures.steel.surface,
  }), uniforms, "pipeline-steel")
  const wool = leaking(new MeshStandardMaterial({
    color: 0xd8d0bd, metalness: 0, roughness: 0.96, map: textures.wool.color, normalMap: textures.wool.normal, normalScale: scale(1.4),
  }), uniforms, "pipeline-wool")
  const band = new MeshPhysicalMaterial({ color: 0x8d8b86, metalness: 1, roughness: 0.34, normalMap: textures.jacket.normal, normalScale: scale(0.3) })
  const machined = new MeshPhysicalMaterial({ color: 0x8b8c90, metalness: 1, roughness: 0.36, normalMap: textures.steel.normal, normalScale: scale(0.2) })
  const bolt = new MeshStandardMaterial({ color: 0x8a8a8c, metalness: 1, roughness: 0.3 })
  const gasket = new MeshStandardMaterial({ color: 0x151413, metalness: 0, roughness: 0.8 })
  const weld = new MeshStandardMaterial({ color: 0x6b6966, metalness: 1, roughness: 0.5, normalMap: textures.wool.normal, normalScale: scale(1.2) })
  const painted = new MeshStandardMaterial({ color: 0x3b3a38, metalness: 0.2, roughness: 0.62, normalMap: textures.steel.normal, normalScale: scale(0.25) })
  const concrete = new MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.9, map: textures.concrete.color, normalMap: textures.concrete.normal })
  const housing = new MeshStandardMaterial({ color: 0x2c2b2a, metalness: 0.35, roughness: 0.5 })
  const all = { jacket, steel, wool, band, machined, bolt, gasket, weld, painted, concrete, housing }
  return { ...all, uniforms, dispose() { for (const m of Object.values(all)) m.dispose() } }
}
