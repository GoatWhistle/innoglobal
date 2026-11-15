import {
  BackSide,
  Color,
  CubeCamera,
  HalfFloatType,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLCubeRenderTarget,
} from "three"

const PANELS = [
  [30, 5, [-2, 14, 9], 3.8],
  [34, 1.8, [0, 10, -10], 3.2],
  [8, 12, [-21, 5, 5], 1.3],
  [24, 1.2, [2, 0.9, 17], 1.1],
  [5, 11, [19, 6, -7], 1.7],
  [10, 3, [8, 16, -2], 1.4],
]

const DOME = {
  vertexShader:
    "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader:
    "uniform vec3 uSky; uniform vec3 uFloor; varying vec3 vDir; void main() { gl_FragColor = vec4(mix(uFloor, uSky, smoothstep(-0.25, 0.45, vDir.y)), 1.0); }",
}

export function createStudio(renderer) {
  const cache = new Map()
  const generator = new PMREMGenerator(renderer)
  function build(light) {
    const scene = new Scene()
    const dome = new Mesh(
      new SphereGeometry(60, 32, 16),
      new ShaderMaterial({
        ...DOME,
        side: BackSide,
        uniforms: {
          uSky: { value: new Color(light ? 0xaaa59c : 0x151412) },
          uFloor: { value: new Color(light ? 0xb5b1a9 : 0x1a1816) },
        },
      }),
    )
    scene.add(dome)
    for (const [w, h, position, intensity] of PANELS) {
      const power = intensity * (light ? 1.5 : 1)
      const panel = new Mesh(
        new PlaneGeometry(w, h),
        new MeshBasicMaterial({ color: new Color(power, power * 0.975, power * 0.93) }),
      )
      panel.position.set(...position)
      panel.lookAt(0, 2, 0)
      scene.add(panel)
    }
    const cube = new WebGLCubeRenderTarget(256, {
      type: HalfFloatType,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
    })
    const camera = new CubeCamera(0.1, 200, cube)
    camera.position.set(0, 2, 0)
    camera.update(renderer, scene)
    const target = generator.fromCubemap(cube.texture)
    scene.traverse((o) => {
      o.geometry?.dispose()
      o.material?.dispose()
    })
    return { cube, target }
  }
  function get(light) {
    if (!cache.has(light)) cache.set(light, build(light))
    return cache.get(light)
  }
  return {
    environment: (light) => get(light).target.texture,
    cube: (light) => get(light).cube.texture,
    dispose() {
      cache.forEach(({ cube, target }) => {
        cube.dispose()
        target.dispose()
      })
      generator.dispose()
    },
  }
}
