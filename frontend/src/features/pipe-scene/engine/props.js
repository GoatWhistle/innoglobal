import { BoxGeometry, CylinderGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { common } from "./shaders.js"

const HEIGHT = 0.3
const SUPPORTS = 13

const groundVertex = `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const groundFragment = `
uniform sampler2D uConcrete;
uniform vec3 uGround, uShade, uLight;
uniform float uProps, uL, uR, uLift, uEnd, uGrain;
varying vec3 vWorld;
${common}
void main() {
  vec2 p = vWorld.xz;
  float e = length(vec2(p.x / (uL * 0.5 + 3.2), (p.y - 0.4) / 3.4));
  float alpha = 1.0 - smoothstep(0.5, 1.0, e);
  vec3 l = normalize(uLight);
  vec2 sp = p + l.xz / l.y * uLift;
  float across = abs(sp.y);
  float along = max(-uL * 0.5 - sp.x, sp.x - uEnd);
  float shadow = (1.0 - smoothstep(uR * 0.5, uR * 2.6, across)) * (1.0 - smoothstep(-0.2, 0.5, along));
  float contact = (1.0 - smoothstep(0.0, uR * 1.1, abs(p.y))) * (1.0 - smoothstep(-0.1, 0.2, max(-uL * 0.5 - p.x, p.x - uEnd)));
  float grain = texture2D(uConcrete, p / 2.4).r;
  vec3 color = uGround * (1.0 + uGrain * (grain - 0.5 + 0.15 * (vnoise(p * 3.0) - 0.5)));
  color = mix(color, uShade, shadow * 0.55 + contact * 0.2);
  gl_FragColor = vec4(color, alpha * uProps);
}`

const postVertex = `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const postFragment = `
uniform samplerCube uEnv;
uniform vec3 uPaint, uLight;
uniform float uProps, uEnd, uAmbient, uEnvPower;
varying vec3 vWorld;
varying vec3 vNormal;
${common}
void main() {
  if (hash(floor(gl_FragCoord.xy)) > uProps || vWorld.x > uEnd + 0.05) discard;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float diffuse = max(dot(n, normalize(uLight)), 0.0);
  float grime = vnoise(vWorld.xy * 40.0) * 0.12;
  vec3 env = envAt(uEnv, reflect(-v, n), 4.5);
  vec3 color = uPaint * (uAmbient + (1.0 - uAmbient) * diffuse) * (0.94 + grime) + env * 0.08 * uEnvPower;
  gl_FragColor = vec4(color, 1.0);
}`

function supportGeometry(L, R) {
  const parts = []
  const top = -R - 0.004,
    floor = -R - HEIGHT
  for (let i = 0; i < SUPPORTS; i++) {
    const x = (i / (SUPPORTS - 1) - 0.5) * L * 0.96
    const saddle = new CylinderGeometry(
      R + 0.014,
      R + 0.014,
      0.1,
      28,
      1,
      true,
      Math.PI * 0.62,
      Math.PI * 0.76,
    )
      .rotateZ(Math.PI / 2)
      .translate(x, 0, 0)
    const post = new BoxGeometry(0.05, top - floor - 0.05, 0.24).translate(
      x,
      (top + floor + 0.05) / 2 - 0.02,
      0,
    )
    const cap = new BoxGeometry(0.14, 0.022, 0.5).translate(x, -R * 0.82, 0)
    const plate = new BoxGeometry(0.22, 0.02, 0.3).translate(x, floor + 0.05, 0)
    const pad = new BoxGeometry(0.34, 0.05, 0.42).translate(x, floor + 0.025, 0)
    parts.push(
      saddle.toNonIndexed(),
      post.toNonIndexed(),
      cap.toNonIndexed(),
      plate.toNonIndexed(),
      pad.toNonIndexed(),
    )
  }
  const merged = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  return merged
}

export function createProps({ L, R, concrete, shared }) {
  const end = { value: L / 2 }
  const props = { value: 1 }
  const ground = new Mesh(
    new PlaneGeometry(L + 10, 9).rotateX(-Math.PI / 2).translate(0, -R - HEIGHT, 0.4),
    new ShaderMaterial({
      vertexShader: groundVertex,
      fragmentShader: groundFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uConcrete: { value: concrete },
        uGround: { value: new Vector3() },
        uShade: { value: new Vector3() },
        uLight: shared.uLight,
        uProps: props,
        uL: { value: L },
        uR: { value: R },
        uLift: { value: R + HEIGHT },
        uEnd: end,
        uGrain: { value: 0.28 },
      },
    }),
  )
  ground.renderOrder = -1
  const posts = new Mesh(
    supportGeometry(L, R),
    new ShaderMaterial({
      vertexShader: postVertex,
      fragmentShader: postFragment,
      uniforms: {
        uEnv: shared.uEnv,
        uPaint: { value: new Vector3() },
        uLight: shared.uLight,
        uProps: props,
        uEnd: end,
        uAmbient: shared.uAmbient,
        uEnvPower: shared.uEnvPower,
      },
    }),
  )
  for (const mesh of [ground, posts]) mesh.frustumCulled = false
  return {
    meshes: [ground, posts],
    update(unroll, cut) {
      props.value = 1 - Math.min(1, unroll / 0.3)
      end.value = cut <= 1 ? (cut - 0.5) * L : L / 2 + 1
      ground.visible = posts.visible = props.value > 0.001
    },
    setTheme(light, raw) {
      ground.material.uniforms.uGround.value.copy(
        raw(light ? "--surface-base" : "--surface-raised"),
      )
      ground.material.uniforms.uGrain.value = light ? 0.05 : 0.28
      ground.material.uniforms.uShade.value.copy(
        light ? raw("--ink-300") : new Vector3(0.01, 0.01, 0.01),
      )
      posts.material.uniforms.uPaint.value.copy(light ? raw("--ink-600") : raw("--ink-775"))
    },
    dispose() {
      for (const mesh of [ground, posts]) {
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
    },
  }
}
