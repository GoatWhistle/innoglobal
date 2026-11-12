import {
  BackSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
} from "three"

const DOME = {
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSky;
    uniform vec3 uFloor;
    varying vec3 vDir;
    void main() {
      float t = smoothstep(-0.08, 0.12, vDir.y);
      gl_FragColor = vec4(mix(uFloor, uSky, t), 1.0);
    }
  `,
}

function strip(scene, width, height, position, target, intensity) {
  const material = new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(intensity) })
  const mesh = new Mesh(new PlaneGeometry(width, height), material)
  mesh.position.set(...position)
  mesh.lookAt(...target)
  scene.add(mesh)
}

export function createStudio(renderer) {
  const pmrem = new PMREMGenerator(renderer)
  const cache = new Map()

  function build(dark, colors) {
    const scene = new Scene()
    const floor = colors.void.clone().multiplyScalar(dark ? 1 : 0.92)
    const sky = dark ? new Color(0.004, 0.004, 0.004) : new Color(0.03, 0.03, 0.03)
    const dome = new Mesh(
      new SphereGeometry(50, 48, 24),
      new ShaderMaterial({
        ...DOME,
        side: BackSide,
        uniforms: { uSky: { value: sky }, uFloor: { value: dark ? new Color(0.09, 0.09, 0.09) : floor } },
      }),
    )
    scene.add(dome)
    strip(scene, 90, 12, [0, 16, 30], [0, 0, 0], dark ? 4.5 : 4)
    strip(scene, 90, 2.4, [0, 24, 4], [0, 0, 0], dark ? 16 : 14)
    strip(scene, 90, 1.2, [0, 9, -20], [0, 0, 0], dark ? 9 : 6)
    strip(scene, 90, 0.5, [0, 3, 28], [0, 0, 0], dark ? 6 : 6)
    return pmrem.fromScene(scene, 0.015).texture
  }

  return {
    get(dark, colors) {
      const key = `${dark}:${colors.void.getHexString()}`
      if (!cache.has(key)) cache.set(key, build(dark, colors))
      return cache.get(key)
    },
  }
}
