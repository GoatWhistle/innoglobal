import { CustomBlending, FloatType, HalfFloatType, Matrix3, MaxEquation, Mesh, NearestFilter, OneFactor, OrthographicCamera, PlaneGeometry, Points, RGBAFormat, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderTarget } from "three"

const QUAD = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }"

const SPLAT = {
  vertexShader: `attribute float aSize; uniform float uScale; varying float vDepth; varying float vRadius;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z; vRadius = aSize;
      gl_PointSize = aSize * uScale / max(0.1, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `varying float vDepth; varying float vRadius;
    void main() {
      vec2 c = gl_PointCoord * 2.0 - 1.0;
      float r2 = dot(c, c);
      if (r2 > 1.0) discard;
      gl_FragColor = vec4(1.0 / (vDepth - sqrt(1.0 - r2) * vRadius), 1.0, 0.0, 1.0);
    }`,
}

const BLUR = `uniform sampler2D tSource; uniform vec2 uStep; uniform float uInverse; uniform float uReach; uniform float uFar; varying vec2 vUv;
  float depthOf(vec4 t) { return t.g > 0.0 ? (uInverse > 0.5 ? 1.0 / t.r : t.r) : 0.0; }
  void main() {
    vec4 here = texture2D(tSource, vUv);
    float center = depthOf(here);
    float covered = step(0.5, uInverse > 0.5 ? here.g : step(1e-4, here.r));
    float reach = uReach / max(center > 0.0 ? center : uFar, 0.5);
    float sum = 0.0, weight = 0.0, cover = 0.0, total = 0.0;
    for (int i = -10; i <= 10; i++) {
      float k = float(i) / 10.0;
      vec4 t = texture2D(tSource, vUv + uStep * k * reach);
      float d = depthOf(t);
      float has = uInverse > 0.5 ? t.g : step(1e-4, t.r);
      float g = exp(-k * k * 2.6);
      float w = g * step(1e-4, d) * (covered > 0.5 ? exp(-pow((d - center) * 5.0, 2.0)) : 1.0);
      sum += d * w; weight += w;
      cover += (uInverse > 0.5 ? has : t.g) * g; total += g;
    }
    gl_FragColor = vec4(weight > 1e-5 ? sum / weight : 0.0, cover / total, 0.0, 1.0);
  }`

const SHADE = `uniform sampler2D tFluid; uniform samplerCube tEnv; uniform vec2 uTexel; uniform vec2 uTan; uniform mat3 uCamera; uniform vec2 uProjection;
  uniform vec3 uLight; uniform vec3 uSide; uniform float uEnv; uniform float uWarm; uniform float uFade; varying vec2 vUv;
  vec3 viewAt(vec2 uv, float d) { return vec3((uv * 2.0 - 1.0) * uTan * d, -d); }
  void main() {
    vec4 t = texture2D(tFluid, vUv);
    float alpha = smoothstep(0.4, 0.52, t.g) * uFade;
    if (alpha < 0.01 || t.r < 1e-4) discard;
    vec3 p = viewAt(vUv, t.r);
    vec2 ox = vec2(uTexel.x * 3.0, 0.0), oy = vec2(0.0, uTexel.y * 3.0);
    float xr = texture2D(tFluid, vUv + ox).r, xl = texture2D(tFluid, vUv - ox).r;
    float yu = texture2D(tFluid, vUv + oy).r, yd = texture2D(tFluid, vUv - oy).r;
    vec3 dxa = viewAt(vUv + ox, xr) - p, dxb = p - viewAt(vUv - ox, xl);
    vec3 dya = viewAt(vUv + oy, yu) - p, dyb = p - viewAt(vUv - oy, yd);
    vec3 dx = (xl < 1e-4 || (xr > 1e-4 && abs(dxa.z) < abs(dxb.z))) ? dxa : dxb;
    vec3 dy = (yd < 1e-4 || (yu > 1e-4 && abs(dya.z) < abs(dyb.z))) ? dya : dyb;
    vec3 n = normalize(cross(dx, dy));
    float edge = smoothstep(0.62, 0.42, t.g);
    vec3 v = normalize(-p);
    n = normalize(mix(n, normalize(n - v * dot(n, v) + v * 0.9), edge * 0.35));
    if (dot(n, v) < 0.0) n = -n;
    float facing = clamp(dot(n, v), 0.0, 1.0);
    float fresnel = 0.035 + 0.1 * pow(1.0 - facing, 4.0);
    vec3 r = uCamera * reflect(-v, n);
    vec3 coat = min(textureCube(tEnv, r, 1.2).rgb, vec3(1.3));
    float lit = max(dot(n, uLight), 0.0);
    float nh = max(dot(n, normalize(uLight + v)), 0.0);
    float side = max(dot(n, uSide), 0.0) * pow(1.0 - facing, 2.0);
    vec3 body = vec3(0.0075, 0.006, 0.0048) * (0.55 + 0.45 * lit);
    vec3 tint = mix(vec3(0.025, 0.0152, 0.0091), vec3(0.138, 0.061, 0.0168), edge * edge);
    body += tint * lit * (0.18 + 0.5 * edge) * uWarm;
    vec3 shine = vec3(0.768, 0.745, 0.68) * (pow(nh, 18.0) * 0.08 + pow(nh, 260.0) * 1.7);
    vec3 color = body + coat * uEnv * fresnel + shine + vec3(0.386, 0.456, 0.509) * side * 0.05;
    gl_FragColor = vec4(color, alpha);
    float ndc = (uProjection.x * -t.r + uProjection.y) / t.r;
    gl_FragDepth = clamp(ndc * 0.5 + 0.5, 0.0, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

export function createFluid(renderer, geometry) {
  const float = renderer.extensions.has("EXT_color_buffer_float")
  const make = () => new WebGLRenderTarget(4, 4, { type: float ? FloatType : HalfFloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false })
  const a = make(), b = make()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const splat = new ShaderMaterial({ ...SPLAT, uniforms: { uScale: { value: 1 } }, blending: CustomBlending, blendEquation: MaxEquation, blendSrc: OneFactor, blendDst: OneFactor, depthTest: false, depthWrite: false, transparent: true })
  const points = new Points(geometry, splat)
  points.frustumCulled = false
  const splats = new Scene()
  splats.add(points)
  const blur = new ShaderMaterial({ vertexShader: QUAD, fragmentShader: BLUR, depthTest: false, depthWrite: false, uniforms: { tSource: { value: null }, uStep: { value: new Vector2() }, uInverse: { value: 1 }, uReach: { value: 1 }, uFar: { value: 20 } } })
  const shade = new ShaderMaterial({
    vertexShader: QUAD, fragmentShader: SHADE, transparent: true, depthTest: true, depthWrite: true,
    uniforms: { tFluid: { value: a.texture }, tEnv: { value: null }, uTexel: { value: new Vector2() }, uTan: { value: new Vector2() }, uCamera: { value: new Matrix3() }, uProjection: { value: new Vector2() }, uLight: { value: new Vector3(0, 1, 0) }, uSide: { value: new Vector3(1, 0, 0) }, uEnv: { value: 1.0 }, uWarm: { value: 1.0 }, uFade: { value: 1 } },
  })
  const quad = new Mesh(new PlaneGeometry(2, 2), blur)
  quad.frustumCulled = false
  const screen = new Scene()
  screen.add(quad)
  const size = new Vector2(), light = new Vector3(), SIDE = new Vector3(5, 2, 7).normalize()
  let width = 4, height = 4
  function pass(source, target, x, y, inverse) {
    blur.uniforms.tSource.value = source.texture
    blur.uniforms.uStep.value.set(x, y)
    blur.uniforms.uInverse.value = inverse
    renderer.setRenderTarget(target)
    renderer.render(screen, camera)
  }
  return {
    setEnvironment(texture, light) {
      shade.uniforms.tEnv.value = texture
      shade.uniforms.uEnv.value = light ? 0.75 : 1
      shade.uniforms.uWarm.value = light ? 1.25 : 1
    },
    render(view, lightDirection, far, fade) {
      renderer.getDrawingBufferSize(size)
      const w = Math.max(4, Math.round(size.x)), h = Math.max(4, Math.round(size.y))
      if (w !== width || h !== height) { width = w; height = h; a.setSize(w, h); b.setSize(w, h) }
      const tan = Math.tan(view.fov * Math.PI / 360)
      const scale = h / tan
      splat.uniforms.uScale.value = scale
      const clear = renderer.getClearAlpha()
      const auto = renderer.autoClear
      renderer.autoClear = true
      renderer.setClearAlpha(0)
      renderer.setRenderTarget(a)
      renderer.clear()
      renderer.render(splats, view)
      quad.material = blur
      blur.uniforms.uReach.value = 0.085 * scale * 0.5
      blur.uniforms.uFar.value = far
      pass(a, b, 1 / w, 0, 1)
      pass(b, a, 0, 1 / h, 0)
      blur.uniforms.uReach.value = 0.06 * scale * 0.5
      pass(a, b, 1 / w, 0, 0)
      pass(b, a, 0, 1 / h, 0)
      blur.uniforms.uReach.value = 0.03 * scale * 0.5
      pass(a, b, 1 / w, 0, 0)
      pass(b, a, 0, 1 / h, 0)
      renderer.setRenderTarget(null)
      renderer.setClearAlpha(clear)
      renderer.autoClear = false
      quad.material = shade
      shade.uniforms.uTexel.value.set(1 / w, 1 / h)
      shade.uniforms.uTan.value.set(tan * view.aspect, tan)
      shade.uniforms.uCamera.value.setFromMatrix4(view.matrixWorld)
      shade.uniforms.uProjection.value.set(view.projectionMatrix.elements[10], view.projectionMatrix.elements[14])
      shade.uniforms.uLight.value.copy(light.copy(lightDirection).transformDirection(view.matrixWorldInverse))
      shade.uniforms.uSide.value.copy(light.copy(SIDE).transformDirection(view.matrixWorldInverse))
      shade.uniforms.uFade.value = fade
      renderer.render(screen, camera)
      renderer.autoClear = auto
    },
    dispose() { a.dispose(); b.dispose(); splat.dispose(); blur.dispose(); shade.dispose(); quad.geometry.dispose() },
  }
}
