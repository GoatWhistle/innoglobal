import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three"
import { HALF } from "./layout.js"
import { BACKDROP } from "./backdrop.js"
import { NOISE } from "./noise.js"

const vertexShader = `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const fragmentShader = `
uniform vec3 uPitch;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uDeep;
uniform vec3 uBlood;
uniform float uRadius;
uniform float uHalf;
uniform vec2 uLeak;
uniform float uAge;
uniform float uStain;
uniform float uFade;
varying vec3 vWorld;
${NOISE}
${BACKDROP}

void main() {
  vec2 p = vWorld.xz;
  float pool = exp(-pow(p.x / (uHalf * 1.25), 2.0) - pow((p.y - uRadius * 2.0) / (uHalf * 0.42), 2.0));
  vec3 lit = mix(uVoid, uInk, mix(0.0, 0.085, uDark));
  vec3 base = mix(uVoid, lit, pool);
  float satin = fbm(vec3(p * 0.09 + vec2(-uTime * 0.012, 0.0), uTime * 0.02));
  base *= 1.0 + satin * mix(0.035, 0.22, uDark) * pool;
  if (uDark < 0.5) base = mix(base, uInk, (1.0 - pool) * 0.05 + satin * 0.012);

  float z = p.y;
  float contact = exp(-z * z / (uRadius * uRadius * 0.7)) * 0.85 + exp(-pow(z - uRadius * 1.1, 2.0) / (uRadius * uRadius * 2.6)) * 0.45;
  vec3 shade = mix(uInk, uVoid, mix(0.55, 1.0, uDark)) * mix(1.0, 0.0, uDark);
  base = mix(base, shade, contact * mix(0.38, 0.9, uDark));

  if (uAge >= 0.0) {
    float t = max(uAge - 0.35, 0.0);
    float grow = 1.0 - exp(-t / 3.4);
    float radius = uStain * (0.04 + 0.96 * grow) * step(0.0, uAge - 0.35);
    vec2 rel = p - uLeak;
    vec2 q = rel / vec2(1.45, 1.0);
    float ang = atan(q.y, q.x);
    float wobble = snoise(vec3(cos(ang) * 0.8, sin(ang) * 0.8, 1.7)) * 0.14 + snoise(vec3(cos(ang) * 2.2, sin(ang) * 2.2, 4.1)) * 0.05;
    float d = length(q) / max(radius * (1.0 + wobble), 1e-4);
    float aa = fwidth(d) * 1.5;
    float mask = (1.0 - smoothstep(1.0 - aa, 1.0, d)) * uFade;
    float r = length(rel);
    float wave = r * 7.0 / uRadius * 0.52 - uTime * 2.6;
    float damp = exp(-r / (uRadius * 3.0)) * (0.35 + 0.65 * exp(-t * 0.08));
    float slope = cos(wave) * damp * 0.18 + snoise(vec3(p * 0.8 / uRadius * 0.52, uTime * 0.15)) * 0.05;
    vec2 dir = rel / max(r, 1e-4);
    vec3 n = normalize(vec3(-dir.x * slope, 1.0, -dir.y * slope));
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 rd = reflect(-v, n);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
    vec3 env = backdrop(rd) * mix(0.22, 1.0, uDark);
    float strip = pow(max(dot(rd, normalize(vec3(0.0, 0.42, -1.0))), 0.0), 140.0);
    float spot = pow(max(dot(rd, normalize(vec3(-0.35, 0.6, -1.0))), 0.0), 60.0);
    vec3 shine = vec3(strip * 1.4 + spot * 0.5);
    vec3 oil = uPitch + (env + shine) * fres;
    float rim = smoothstep(0.86, 0.985, d);
    vec3 thin = mix(uDeep, uWarm, 0.18);
    oil = mix(oil, mix(base, thin * 0.45, 0.6), rim * 0.35);
    base = mix(base, oil, mask);
  }

  float far = smoothstep(uHalf * 0.9, uHalf * 2.6, length(p * vec2(0.55, 1.4)));
  base = mix(base, backdrop(normalize(vWorld - cameraPosition)), far);
  gl_FragColor = vec4(base, 1.0);
}
`

export function createGround() {
  const uniforms = {
    uVoid: { value: new Color() },
    uInk: { value: new Color() },
    uPitch: { value: new Color() },
    uCool: { value: new Color() },
    uWarm: { value: new Color() },
    uDeep: { value: new Color() },
    uBlood: { value: new Color() },
    uDark: { value: 1 },
    uTime: { value: 0 },
    uRadius: { value: 0.42 },
    uHalf: { value: HALF },
    uLeak: { value: new Vector2() },
    uAge: { value: -1 },
    uStain: { value: 3 },
    uFade: { value: 1 },
  }
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthWrite: false })
  const mesh = new Mesh(new PlaneGeometry(200, 120), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 0
  return {
    mesh,
    uniforms,
    setTheme({ colors, dark }) {
      uniforms.uDark.value = dark ? 1 : 0
      uniforms.uVoid.value.copy(colors.void)
      uniforms.uInk.value.copy(colors.ink)
      uniforms.uPitch.value.copy(colors.crude)
      uniforms.uCool.value.copy(colors.cool)
      uniforms.uWarm.value.copy(colors.warm)
      uniforms.uDeep.value.copy(colors.deep)
      uniforms.uBlood.value.copy(colors.leak)
    },
  }
}
