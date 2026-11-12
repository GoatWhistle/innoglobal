import { MeshPhysicalMaterial, Vector3 } from "three"
import { NOISE } from "../scene/noise.js"

export function fluidMaterial() {
  const uniforms = { uTime: { value: 0 }, uFade: { value: 1 }, uReveal: { value: 2 } }
  const material = new MeshPhysicalMaterial({
    color: 0x080706, roughness: 0.24, metalness: 0, clearcoat: 0.65,
    clearcoatRoughness: 0.23, ior: 1.46, envMapIntensity: 1.15,
  })
  material.customProgramCacheKey = () => "experiment-oil-v1"
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `attribute vec3 aFlow; varying vec2 vFlowUv; varying vec3 vAxial;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nvFlowUv = uv; vAxial = normalize(normalMatrix * aFlow);",
    )
    shader.fragmentShader = `uniform float uTime; uniform float uFade; uniform float uReveal; varying vec2 vFlowUv; varying vec3 vAxial;\n${NOISE}\n${shader.fragmentShader}`.replace(
      "void main() {", `float oilFold(vec2 p) {
        float f = snoise(vec3(p.x * 8.0 - uTime * 0.16, p.y * 3.2, uTime * 0.018));
        float g = snoise(vec3(p.x * 17.0 - uTime * 0.27, p.y * 5.0, 3.0));
        return f * 0.82 + g * 0.18;
      }
      void main() {`,
    ).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec3 axial = normalize(vAxial - normal * dot(vAxial, normal));
      vec3 around = normalize(cross(normal, axial));
      float e = 0.002;
      float h = oilFold(vFlowUv);
      float du = (oilFold(vFlowUv + vec2(e, 0.0)) - h) / e;
      float dv = (oilFold(vFlowUv + vec2(0.0, e)) - h) / e;
      normal = normalize(normal - axial * du * 0.018 - around * dv * 0.06);`,
    ).replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      if (vFlowUv.x > uReveal) discard;`).replace("#include <alphatest_fragment>", `diffuseColor.a *= uFade;\n#include <alphatest_fragment>`)
  }
  return { material, uniforms }
}

export function shellMaterial(config) {
  const uniforms = {
    uOpening: { value: config.opening }, uStart: { value: config.window[0] }, uEnd: { value: config.window[1] },
    uHole: { value: new Vector3(1e4, 0, 0) }, uRadius: { value: config.radius * 0.17 },
  }
  const material = new MeshPhysicalMaterial({ color: 0x242220, roughness: 0.72, metalness: 0.12, clearcoat: 0.04, side: 2 })
  material.customProgramCacheKey = () => "experiment-shell-v1"
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `varying vec2 vPipeUv; varying vec3 vPipePosition;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPipeUv = uv; vPipePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;")
    shader.fragmentShader = `uniform float uOpening; uniform float uStart; uniform float uEnd; uniform vec3 uHole; uniform float uRadius; varying vec2 vPipeUv; varying vec3 vPipePosition;\n${shader.fragmentShader}`.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      float front = dot(normalize(vNormal), normalize(vViewPosition));
      if (vPipeUv.x > uStart && vPipeUv.x < uEnd && front > uOpening) discard;
      if (distance(vPipePosition, uHole) < uRadius) discard;`)
  }
  return { material, uniforms }
}
