import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from "three"

export const BACKDROP = `
uniform vec3 uVoid;
uniform vec3 uInk;
uniform float uDark;
uniform float uTime;
vec3 backdrop(vec3 dir) {
  float glow = exp(-pow((dir.x + 0.08) * 1.6, 2.0) - pow((dir.y - 0.1) * 4.5, 2.0));
  float breathe = 0.85 + 0.15 * sin(uTime * 0.21 + dir.x * 2.0);
  return mix(uVoid, uInk, glow * breathe * mix(0.035, 0.075, uDark));
}
`

const vertexShader = `
varying vec3 vDir;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDir = normalize(w.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const fragmentShader = `
${BACKDROP}
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(backdrop(normalize(vDir)), 1.0);
}
`

export function backdropUniforms() {
  return {
    uVoid: { value: new Color() },
    uInk: { value: new Color() },
    uDark: { value: 1 },
    uTime: { value: 0 },
  }
}

export function createBackdrop(uniforms) {
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: BackSide, depthWrite: false })
  const mesh = new Mesh(new SphereGeometry(400, 32, 16), material)
  mesh.renderOrder = -1
  mesh.frustumCulled = false
  return { mesh }
}
