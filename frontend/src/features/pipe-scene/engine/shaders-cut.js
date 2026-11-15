import { common } from "./shaders.js"

export const capVertex = `
attribute float aEdge;
varying vec3 vWorld;
varying float vEdge;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vEdge = aEdge;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

export const capFragment = `
uniform samplerCube uEnv;
uniform vec3 uSteel, uPaper, uInk;
uniform float uSpec, uDrawing, uOpacity, uEnvPower;
varying vec3 vWorld;
varying float vEdge;
${common}
void main() {
  vec3 radial = normalize(vec3(0.0, vWorld.y, vWorld.z) + vec3(0.0, 1e-5, 0.0));
  float outer = 1.0 - smoothstep(0.0, 0.1, vEdge);
  float inner = smoothstep(0.9, 1.0, vEdge);
  vec3 n = normalize(vec3(1.0, 0.0, 0.0) + radial * outer * 1.1 - radial * inner * 1.1);
  float r = length(vWorld.yz);
  float lathe = vnoise(vec2(r * 900.0, atan(vWorld.z, vWorld.y) * 3.0));
  float grain = vnoise(vWorld.yz * 900.0);
  vec3 albedo = uSteel * (0.9 + 0.14 * lathe + 0.12 * grain);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 l = normalize(vec3(0.7, 0.55, 0.45));
  float diffuse = max(dot(n, l), 0.0);
  float bevel = max(outer, inner);
  vec3 env = envAt(uEnv, reflect(-v, n), mix(3.2, 1.2, bevel));
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), 36.0) * uSpec;
  vec3 metal = albedo * (0.3 + 0.5 * diffuse) + env * albedo * uEnvPower * (0.85 + bevel * 0.9) + vec3(spec * (0.2 + bevel * 0.8));
  float hatch = step(0.62, fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0));
  vec3 paper = mix(uPaper, uInk, hatch * 0.55);
  gl_FragColor = vec4(mix(metal, paper, uDrawing), uOpacity);
}`

export const oilVertex = `
attribute float aRim;
varying vec3 vWorld;
varying float vRim;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vRim = aRim;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

export const oilFragment = `
uniform samplerCube uEnv;
uniform vec3 uCrude, uSheen, uLight;
uniform float uOpacity, uDrawing, uEnvPower, uTime;
varying vec3 vWorld;
varying float vRim;
${common}
float flowNoise(vec2 p, float f, float seed) {
  float ia = floor(f), ib = floor(f + 0.5);
  float wa = 1.0 - abs(2.0 * fract(f) - 1.0);
  vec2 oa = vec2(hash(vec2(ia, seed)), hash(vec2(ia, seed + 5.3))) * 17.0;
  vec2 ob = vec2(hash(vec2(ib, seed + 2.1)), hash(vec2(ib, seed + 8.7))) * 17.0;
  float mixed = vnoise(p + oa) * wa + vnoise(p + ob) * (1.0 - wa);
  return (mixed - 0.5) / sqrt(wa * wa + (1.0 - wa) * (1.0 - wa));
}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 radial = normalize(vec3(0.0, vWorld.y, vWorld.z) + vec3(0.0, 1e-5, 0.0));
  float meniscus = smoothstep(0.84, 1.0, vRim);
  float profile = 1.0 - vRim * vRim;
  float swell = flowNoise(vWorld.yz * 2.1, uTime * 0.11 * profile, 1.0);
  float ripple = flowNoise(vWorld.yz * 6.5, uTime * 0.17 * profile, 4.0);
  vec3 n = normalize(vec3(1.0, 0.42, 0.12) - radial * meniscus * 0.8 + vec3(0.0, swell * 0.26 + ripple * 0.05, -swell * 0.2));
  vec3 h = normalize(normalize(uLight) + v);
  float nh = max(dot(n, h), 0.0);
  float facing = max(dot(n, v), 0.0);
  float fresnel = 0.035 + 0.1 * pow(1.0 - facing, 4.0) + meniscus * 0.12;
  vec3 coat = min(textureCube(uEnv, reflect(-v, n), 1.2).rgb, vec3(1.3));
  vec3 body = vec3(0.082, 0.071, 0.059);
  vec3 shine = vec3(0.89, 0.88, 0.84) * (pow(nh, 18.0) * 0.08 + pow(nh, 260.0) * 1.7);
  vec3 color = body + coat * fresnel * uEnvPower + shine + uSheen * meniscus * 0.05;
  gl_FragColor = vec4(mix(color, uCrude, uDrawing), uOpacity);
}`
