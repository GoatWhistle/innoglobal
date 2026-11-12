import { MeshPhysicalMaterial } from "three"
import { NOISE } from "../scene/noise.js"

export function createOil() {
  const uniforms = { uTime: { value: 0 }, uSpeed: { value: 1 } }
  const material = new MeshPhysicalMaterial({
    color: 0x040303, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, ior: 1.47,
    envMapIntensity: 1.5, iridescence: 0.1, iridescenceIOR: 1.3, iridescenceThicknessRange: [260, 340],
  })
  material.customProgramCacheKey = () => "pipeline-oil"
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `attribute vec3 aFlow; varying vec2 vOilUv; varying vec3 vAxial;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nvOilUv = uv; vAxial = normalize(normalMatrix * aFlow);")
    shader.fragmentShader = `uniform float uTime; uniform float uSpeed; varying vec2 vOilUv; varying vec3 vAxial;\n${NOISE}\n${shader.fragmentShader}`.replace(
      "void main() {", `float oilFold(vec2 p) {
        float t = uTime * uSpeed;
        float a = snoise(vec3(p.x * 0.42 - t * 0.5, p.y * 2.6, t * 0.03));
        float b = snoise(vec3(p.x * 1.1 - t * 0.9, p.y * 5.2 + a * 0.5, 3.0 + t * 0.05));
        float c = snoise(vec3(p.x * 3.0 - t * 1.5, p.y * 9.0, 7.0));
        return a * 0.62 + b * 0.3 + c * 0.08;
      }
      void main() {`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec3 axial = normalize(vAxial - normal * dot(vAxial, normal) + vec3(1e-4, 2e-4, 3e-4));
      vec3 hoop = normalize(cross(normal, axial));
      float e = 0.012;
      float h = oilFold(vOilUv);
      float du = (oilFold(vOilUv + vec2(e, 0.0)) - h) / e;
      float dv = (oilFold(vOilUv + vec2(0.0, e)) - h) / e;
      normal = normalize(normal - axial * du * 0.05 - hoop * dv * 0.045);`)
  }
  return { material, uniforms }
}
