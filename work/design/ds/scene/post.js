import {
  BufferGeometry,
  Float32BufferAttribute,
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from "three"

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragmentShader = `
uniform sampler2D tScene;
uniform float uTime;
uniform float uGrain;
uniform float uVignette;
uniform float uDark;
uniform vec2 uResolution;
varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 color = texture2D(tScene, vUv);
  vec2 c = vUv - 0.5;
  c.x *= uResolution.x / uResolution.y;
  float v = smoothstep(0.35, 1.25, length(c));
  color.rgb *= 1.0 - v * uVignette;
  gl_FragColor = color;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec2 cell = floor(gl_FragCoord.xy / 1.0);
  float n = hash(cell + fract(uTime * 7.31) * 913.0) + hash(cell * 1.37 + fract(uTime * 3.17) * 211.0) - 1.0;
  float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  float amount = uGrain * mix(1.0 - luma * 0.6, 0.6 + luma * 0.4, uDark);
  gl_FragColor.rgb += n * amount;
}
`

export function createPost(renderer, scene, camera) {
  const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  const material = new ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture },
      uTime: { value: 0 },
      uGrain: { value: 0.06 },
      uVignette: { value: 0.4 },
      uDark: { value: 1 },
      uResolution: { value: new Vector2(1, 1) },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  })
  material.toneMapped = true
  const quad = new Mesh(geometry, material)
  quad.frustumCulled = false
  const screen = new Scene()
  screen.add(quad)
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  return {
    setSize(w, h, ratio) {
      target.setSize(Math.round(w * ratio), Math.round(h * ratio))
      material.uniforms.uResolution.value.set(w, h)
    },
    setTheme({ dark }) {
      material.uniforms.uDark.value = dark ? 1 : 0
      material.uniforms.uGrain.value = dark ? 0.008 : 0.008
      material.uniforms.uVignette.value = dark ? 0.08 : 0.05
    },
    render(time) {
      material.uniforms.uTime.value = time
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(screen, ortho)
    },
  }
}
