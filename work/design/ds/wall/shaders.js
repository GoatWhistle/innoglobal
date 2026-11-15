export const wallVertex = `
uniform float uUnroll, uL, uR;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
const float PI = 3.14159265;
void main() {
  vUv = uv;
  float s = (uv.y - 0.5) * 2.0 * PI * uR;
  float k = max((1.0 - uUnroll) / uR, 1e-4);
  float a = k * s;
  vec3 p = vec3((uv.x - 0.5) * uL, sin(a) / k, uR - (1.0 - cos(a)) / k);
  vec3 n = vec3(0.0, sin(a), cos(a));
  float b = (1.0 - uUnroll) * PI * 0.5;
  float cb = cos(b), sb = sin(b);
  p = vec3(p.x, p.y * cb - p.z * sb, p.y * sb + p.z * cb);
  n = vec3(0.0, n.y * cb - n.z * sb, n.y * sb + n.z * cb);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`

export const common = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 envAt(samplerCube map, vec3 dir, float blur) {
  vec3 e = textureCube(map, dir, blur).rgb;
  return sqrt(e / (1.0 + e));
}`

export const wallFragment = `
uniform sampler2D uField, uSteelMap, uSteelNormal, uSteelSurface;
uniform samplerCube uEnv;
uniform vec3 uSteel, uRust, uAmber, uInside, uMark, uGrid, uLight;
uniform float uUnroll, uSel, uHalf, uCut, uDissolve, uAmbient, uSpec, uTexScale, uHover, uLength, uL, uR, uEnvPower, uJoints;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
${common}
float line(float value, float step) {
  float x = value / step;
  return 1.0 - min(abs(fract(x + 0.5) - 0.5) / max(fwidth(x), 1e-5), 1.0);
}
void main() {
  if (vUv.x > uCut && hash(floor(gl_FragCoord.xy)) < uDissolve) discard;
  float value = texture2D(uField, vec2(vUv.x * uTexScale, vUv.y)).r;
  vec2 st = vec2(vUv.x * uL, vUv.y * 6.2831853 * uR);
  vec2 tuv = st.yx / vec2(2.6, 3.4);
  float tex = texture2D(uSteelMap, tuv).r;
  float grit = texture2D(uSteelSurface, tuv).g;
  vec3 tn = texture2D(uSteelNormal, tuv).xyz * 2.0 - 1.0;
  float pit = vnoise(st * 42.0) * 0.6 + vnoise(st * 130.0) * 0.4;
  float corr = smoothstep(0.24, 0.86, value + (pit - 0.5) * 0.26);
  float deep = smoothstep(0.8, 1.0, value + (pit - 0.5) * 0.12);

  float j = vUv.x * uJoints;
  float jd = abs(fract(j + 0.5) - 0.5) / uJoints * uL;
  float aa = fwidth(vUv.x) * uL;
  float bead = 1.0 - smoothstep(0.007, 0.007 + aa, jd);
  float haz = 1.0 - smoothstep(0.0, 0.06, jd);
  float seamHour = mod(floor(j + 0.5), 2.0) < 0.5 ? 2.0 : 10.0;
  float sd = abs(fract(vUv.y - seamHour / 12.0 + 0.5) - 0.5) * 6.2831853 * uR;
  float seam = (1.0 - smoothstep(0.004, 0.004 + fwidth(vUv.y) * 6.2831853 * uR, sd)) * (1.0 - bead);

  float fine = 1.0 - smoothstep(0.15, 0.6, fwidth(st.y * 420.0));
  float brushed = vnoise(vec2(st.x * 2.5, st.y * 140.0)) * (1.0 - 0.45 * fine) + vnoise(vec2(st.x * 9.0, st.y * 420.0)) * 0.45 * fine;
  float mottle = vnoise(st * 1.7) * 0.6 + vnoise(st * 5.0) * 0.4;
  vec3 albedo = uSteel * (0.78 + 0.16 * brushed + 0.22 * mottle + 0.06 * tex);
  albedo = mix(albedo, albedo * vec3(0.86, 0.8, 0.74), haz * 0.55);
  albedo *= 1.0 - 0.32 * max(bead, seam);
  vec3 rust = uRust * (0.62 + 0.7 * pit);
  albedo = mix(albedo, rust, corr);
  albedo = mix(albedo, uAmber, deep * 0.9);
  float metal = 1.0 - corr;
  float rough = mix(0.26 + mottle * 0.22 + grit * 0.1, 0.86, corr);

  vec3 n = normalize(vNormal);
  vec3 tA = vec3(1.0, 0.0, 0.0);
  vec3 bA = normalize(cross(n, tA));
  float beadSide = sign(fract(j + 0.5) - 0.5) * bead;
  n = normalize(n + (tA * tn.y + bA * tn.x) * corr * 0.9 + bA * (brushed - 0.5) * 0.05 + tA * beadSide * 0.6);

  vec3 v = normalize(cameraPosition - vWorld);
  vec3 l = normalize(uLight);
  float diffuse = max(dot(n, l), 0.0);
  vec3 env = envAt(uEnv, reflect(-v, n), rough * 7.0);
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  vec3 fres = f0 + (1.0 - f0) * pow(1.0 - max(dot(n, v), 0.0), 5.0) * (1.0 - rough);
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), mix(90.0, 10.0, rough)) * uSpec * (1.0 - rough);
  vec3 lit = albedo * (uAmbient + (1.0 - uAmbient) * diffuse) * mix(1.0, 0.55, metal) + env * fres * uEnvPower + vec3(spec);

  vec3 sheetN = normalize(vec3(tn.xy * corr * 0.8 + vec2(0.0, brushed - 0.5) * 0.12, 1.0) + vec3(beadSide * 0.5, 0.0, 0.0));
  vec3 sheet = albedo * (0.74 + 0.36 * dot(sheetN, normalize(vec3(-0.35, 0.45, 0.82))));
  vec3 color = gl_FrontFacing ? mix(lit, sheet, uUnroll) : mix(uInside, albedo, 0.12);

  float grid = max(line(vUv.y, 0.25), line(vUv.x * uLength, 1000.0)) * uUnroll;
  color = mix(color, uGrid, grid * 0.22);
  float iso = max(line(value, 0.25) * step(0.2, value), line(value, 0.125) * step(0.62, value) * 0.6) * uUnroll;
  color = mix(color, uGrid, iso * 0.45);
  float edge = fwidth(vUv.x);
  float width = max(uHalf, edge * 1.4);
  float chosen = 1.0 - smoothstep(width, width + edge, abs(vUv.x - uSel));
  float hover = (1.0 - smoothstep(width, width + edge, abs(vUv.x - uHover))) * step(0.0, uHover);
  color = mix(color, uMark, max(chosen * 0.92, hover * 0.4));
  gl_FragColor = vec4(color, 1.0);
}`
