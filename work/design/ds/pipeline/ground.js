import { CanvasTexture, CircleGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Vector2 } from "three"
import { NOISE } from "../scene/noise.js"

function fade() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 256
  const context = canvas.getContext("2d")
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
  for (const [stop, value] of [[0, 255], [0.3, 235], [0.5, 150], [0.68, 60], [0.84, 10], [0.92, 0]]) gradient.addColorStop(stop, `rgb(${value},${value},${value})`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  return new CanvasTexture(canvas)
}

export function createGround(textures) {
  const alpha = fade()
  const material = new MeshStandardMaterial({
    color: 0x211f1d, roughness: 1, metalness: 0, map: textures.concrete.color, normalMap: textures.concrete.normal,
    normalScale: new Vector2(0.3, 0.3), roughnessMap: textures.concrete.surface, alphaMap: alpha, transparent: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec2 vFadeUv;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFadeUv = position.xy / vec2(40.0, 19.0) + 0.5;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv = position.xy / 5.0; vNormalMapUv = vMapUv; vRoughnessMapUv = vMapUv;")
    shader.fragmentShader = `varying vec2 vFadeUv;\n${shader.fragmentShader}`.replace("#include <alphamap_fragment>", "diffuseColor.a *= texture2D(alphaMap, vFadeUv).g;")
  }
  material.customProgramCacheKey = () => "pipeline-ground"
  const mesh = new Mesh(new CircleGeometry(22, 96), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0, 0.5)
  mesh.receiveShadow = true
  return {
    mesh,
    setTheme(light) { material.color.set(light ? 0xd3d0ca : 0x211f1d) },
    dispose() { mesh.geometry.dispose(); material.dispose(); alpha.dispose() },
  }
}

export function createPuddle() {
  const uniforms = { uGrow: { value: 0 }, uTime: { value: 0 }, uFade: { value: 1 }, uStir: { value: 0 }, uSeed: { value: 0 } }
  const material = new MeshPhysicalMaterial({
    color: 0x15120f, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, ior: 1.5, envMapIntensity: 1.3,
    alphaToCoverage: true,
  })
  material.customProgramCacheKey = () => "pipeline-puddle"
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `varying vec2 vPool;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPool = position.xy;")
    shader.fragmentShader = `uniform float uGrow; uniform float uTime; uniform float uFade; uniform float uStir; uniform float uSeed; varying vec2 vPool;\n${NOISE}\n${shader.fragmentShader}`
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      vec2 poolDir = normalize(vPool + vec2(1e-5));
      float poolR = length(vPool);
      float poolEdge = uGrow * (1.0 + 0.2 * snoise(vec3(poolDir * 1.25, uSeed)) + 0.07 * snoise(vec3(poolDir * 3.1, uSeed + 5.0)));
      float poolD = poolR / max(poolEdge, 1e-4);
      float poolSoft = max(fwidth(poolD) * 2.0, 1e-4);
      float spatter = smoothstep(0.5, 0.62, snoise(vec3(vPool * 7.5, uSeed))) * step(1.0, poolD) * (1.0 - smoothstep(1.04, 1.5, poolD)) * smoothstep(0.5, 1.2, uGrow);
      float poolAlpha = max(1.0 - smoothstep(1.0 - poolSoft, 1.0, poolD), spatter) * uFade;
      if (poolAlpha < 0.004) discard;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
      float poolThin = smoothstep(0.86, 1.0, poolD) * step(poolD, 1.0) + spatter * 0.3;
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.025, 0.0152, 0.0091), vec3(0.056, 0.029, 0.0137), smoothstep(0.96, 1.0, poolD)), min(1.0, poolThin) * 0.7);`)
      .replace("#include <alphatest_fragment>", "diffuseColor.a = poolAlpha;\n#include <alphatest_fragment>")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float lip = smoothstep(0.9, 1.0, poolD) * 1.1 * step(poolD, 1.0);
      float wave = sin(poolR * 26.0 - uTime * 3.6) * exp(-poolR * 3.2) * uStir * 0.22;
      float swell = snoise(vec3(vPool * 2.2, uTime * 0.1)) * 0.012 * exp(-poolR * 1.4) * (0.3 + 0.7 * uStir);
      vec3 tilt = vec3(poolDir.x, 0.0, -poolDir.y) * (lip + wave) + vec3(swell, 0.0, swell);
      normal = normalize(normal + (viewMatrix * vec4(tilt, 0.0)).xyz);`)
  }
  const mesh = new Mesh(new PlaneGeometry(9, 9), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.006
  mesh.renderOrder = 2
  mesh.visible = false
  mesh.receiveShadow = true
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); material.dispose() } }
}
