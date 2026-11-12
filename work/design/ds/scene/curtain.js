import {
  Color,
  DoubleSide,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from "three"
import { HALF } from "./layout.js"
import { P_RANGE, SAMPLES, SENSORS_M, SEGMENT_M } from "./sim.js"

const COUNT = SENSORS_M.length

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
#define COUNT ${COUNT}
uniform sampler2D uData;
uniform float uGap;
uniform float uHeight;
uniform float uTotal;
uniform float uLength;
uniform float uScale;
uniform float uSensors[COUNT];
uniform float uStates[COUNT];
uniform vec2 uSensorY[COUNT];
uniform vec4 uFront;
uniform vec3 uDetect;
uniform vec2 uHover;
uniform vec3 uFlow;
uniform float uConfirm;
uniform float uTime;
uniform float uDark;
uniform float uMirror;
uniform vec3 uInk;
uniform vec3 uWarm;
uniform vec3 uDanger;
varying vec2 vUv;

vec3 col;
float alpha;

void over(vec3 c, float a) {
  a = clamp(a, 0.0, 1.0);
  col = c * a + col * (1.0 - a);
  alpha = a + alpha * (1.0 - a);
}

float lineDist(float g) {
  return abs(g) / max(length(vec2(dFdx(g), dFdy(g))), 1e-5);
}

vec3 stateColor(float s) {
  vec3 c = mix(uInk, uWarm, clamp(s, 0.0, 1.0));
  return mix(c, uDanger, clamp(s - 1.0, 0.0, 1.0));
}

void main() {
  col = vec3(0.0);
  alpha = 0.0;
  float u = vUv.x;
  float y = vUv.y * uTotal;
  float x = (u - 0.5) * uLength;
  vec4 data = texture2D(uData, vec2(u, 0.5));
  float ym = uGap + uHeight * data.r;
  float yr = uGap + uHeight * data.g;
  float pxx = fwidth(x);
  float pxy = fwidth(y);

  float below = 1.0 - smoothstep(yr - pxy * 0.5, yr + pxy * 0.5, y);
  float rise = smoothstep(0.0, yr, y);
  float fill = below * pow(rise, 1.6);
  float offset = x < uFlow.z ? uFlow.x : uFlow.y;
  float pulse = 0.5 + 0.5 * sin((x - offset * 2.2) * 0.42);
  over(uInk, fill * mix(0.07, 0.075, uDark) * (0.7 + 0.3 * pulse));

  float spacing = uLength / 120.0;
  float phase = (x - offset) / spacing;
  float rd = abs(fract(phase) - 0.5) * spacing / pxx;
  float ruling = 1.0 - smoothstep(0.35, 1.1, rd);
  over(uInk, ruling * fill * mix(0.12, 0.075, uDark) * (0.4 + 0.6 * pulse));
  float glow = below * exp(-(yr - y) / (pxy * 46.0));
  over(uInk, glow * mix(0.11, 0.14, uDark));

  float residual = (ym - yr) / uHeight * uScale;
  float gapOn = smoothstep(0.018, 0.04, residual);
  float inGap = smoothstep(yr - pxy * 0.5, yr + pxy * 0.5, y) * (1.0 - smoothstep(ym - pxy * 0.5, ym + pxy * 0.5, y));
  vec3 gapColor = uWarm;
  float hatch = fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0);
  float hatchLine = 1.0 - smoothstep(0.12, 0.26, abs(hatch - 0.5));
  over(gapColor, inGap * gapOn * (mix(0.16, 0.14, uDark) + hatchLine * mix(0.55, 0.3, uConfirm)));

  float hoverOn = uHover.y * step(y, yr);
  over(uInk, hoverOn * (1.0 - smoothstep(0.4, 1.2, abs(x - uHover.x) / pxx)) * 0.55);

  for (int i = 0; i < 2; i++) {
    float fx = i == 0 ? uFront.x : uFront.z;
    float fs = i == 0 ? uFront.y : uFront.w;
    float d = abs(x - fx) / pxx;
    float h = step(y, yr);
    over(uWarm, fs * h * ((1.0 - smoothstep(0.5, 1.4, d)) * 0.9 + exp(-d / 14.0) * 0.12));
  }

  float band = 1.0 - smoothstep(uDetect.y, uDetect.y + pxx * 1.5, abs(x - uDetect.x));
  over(uDanger, uDetect.z * band * 0.06);
  float mark = 1.0 - smoothstep(0.5, 1.5, abs(x - uDetect.x) / pxx);
  over(uDanger, uDetect.z * mark);

  int si = int(floor(u * float(COUNT - 1) + 0.5));
  float sx = 0.0;
  float sr = 0.0;
  float sm = 0.0;
  float st = 0.0;
  for (int i = 0; i < COUNT; i++) {
    if (i == si) {
      sx = (uSensors[i] - 0.5) * uLength;
      sr = uSensorY[i].x;
      sm = uSensorY[i].y;
      st = uStates[i];
    }
  }
  vec3 sc = stateColor(st);
  float sdx = abs(x - sx) / pxx;
  over(uInk, (1.0 - smoothstep(0.4, 1.2, sdx)) * step(y, sr) * mix(0.4, 0.45, uDark));
  over(sc, (1.0 - smoothstep(1.0, 2.0, sdx)) * step(sr, y) * step(y, sm) * smoothstep(0.05, 0.4, st));
  float sdist = length(vec2((x - sx) / pxx, (y - sr) / pxy));
  over(sc, 1.0 - smoothstep(3.2, 4.2, sdist));
  float ringR = 7.0 + 3.0 * sin(uTime * 4.0);
  over(uDanger, (1.0 - smoothstep(0.6, 1.5, abs(sdist - ringR))) * clamp(st - 1.0, 0.0, 1.0) * 0.8);

  over(uInk, (1.0 - smoothstep(0.35, 1.0, lineDist(y - ym))) * mix(0.55, 0.6, uDark));
  over(uInk, 1.0 - smoothstep(0.7, 1.5, lineDist(y - yr)));

  if (alpha < 0.002) discard;
  vec3 straight = col / alpha;
  alpha *= mix(1.0, exp(-vUv.y * 9.0) * mix(0.0, 0.2, uDark), uMirror);
  gl_FragColor = vec4(straight, alpha);
}
`

export function createCurtain() {
  const data = new Uint16Array(SAMPLES * 4)
  const texture = new DataTexture(data, SAMPLES, 1, RGBAFormat, HalfFloatType)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  const uniforms = {
    uData: { value: texture },
    uGap: { value: 0.5 },
    uHeight: { value: 4 },
    uTotal: { value: 6 },
    uLength: { value: HALF * 2 },
    uScale: { value: P_RANGE[1] - P_RANGE[0] },
    uSensors: { value: SENSORS_M.map((m) => m / SEGMENT_M) },
    uStates: { value: SENSORS_M.map(() => 0) },
    uSensorY: { value: SENSORS_M.map(() => new Vector2()) },
    uFront: { value: new Vector4() },
    uDetect: { value: new Vector3(0, 0, 0) },
    uHover: { value: new Vector2(0, 0) },
    uFlow: { value: new Vector3(0, 0, 0) },
    uConfirm: { value: 0 },
    uTime: { value: 0 },
    uDark: { value: 1 },
    uMirror: { value: 0 },
    uInk: { value: new Color() },
    uWarm: { value: new Color() },
    uDanger: { value: new Color() },
  }

  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })
  const geometry = new PlaneGeometry(1, 1)
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 2
  const mirrorMaterial = material.clone()
  mirrorMaterial.uniforms = { ...uniforms, uMirror: { value: 1 } }
  mirrorMaterial.side = DoubleSide
  const mirror = new Mesh(geometry, mirrorMaterial)
  mirror.renderOrder = 1

  const norm = (p) => (p - P_RANGE[0]) / (P_RANGE[1] - P_RANGE[0])

  return {
    mesh,
    mirror,
    uniforms,
    layout(radius, gap, height) {
      const total = gap + height + height * 0.12
      uniforms.uGap.value = gap
      uniforms.uHeight.value = height
      uniforms.uTotal.value = total
      mesh.scale.set(HALF * 2, total, 1)
      mesh.position.set(0, radius * 2 + total / 2, 0)
      mirror.scale.set(HALF * 2, -total, 1)
      mirror.position.set(0, -radius * 2 - total / 2, 0)
    },
    heightAt(pressure) {
      return uniforms.uGap.value + uniforms.uHeight.value * norm(pressure)
    },
    base() {
      return mesh.position.y - uniforms.uTotal.value / 2
    },
    setTheme({ colors, dark }) {
      uniforms.uDark.value = dark ? 1 : 0
      uniforms.uInk.value.copy(colors.ink)
      uniforms.uWarm.value.copy(dark ? colors.warm : colors.warning)
      uniforms.uDanger.value.copy(dark ? colors.danger : colors.leak)
    },
    write(model, measured, reveal = 1) {
      const lift = (v) => norm(v) * reveal
      for (let i = 0; i < SAMPLES; i++) {
        data[i * 4] = DataUtils.toHalfFloat(lift(model[i]))
        data[i * 4 + 1] = DataUtils.toHalfFloat(lift(measured[i]))
      }
      texture.needsUpdate = true
      const { uGap, uHeight, uSensorY } = uniforms
      for (const [i, m] of SENSORS_M.entries()) {
        const f = (m / SEGMENT_M) * (SAMPLES - 1)
        const j = Math.min(Math.floor(f), SAMPLES - 2)
        const k = f - j
        const at = (arr) => lift(arr[j] + (arr[j + 1] - arr[j]) * k)
        uSensorY.value[i].set(uGap.value + uHeight.value * at(measured), uGap.value + uHeight.value * at(model))
      }
    },
  }
}
