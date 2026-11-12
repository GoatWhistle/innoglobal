import { BackSide, Color, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, SphereGeometry } from "three"

export function createStudio(renderer) {
  const cache = new Map()
  const generator = new PMREMGenerator(renderer)
  function environment(light) {
    if (cache.has(light)) return cache.get(light)
    const studio = new Scene()
    const dome = new Mesh(new SphereGeometry(40, 24, 16), new MeshBasicMaterial({ color: light ? 0x44413d : 0x171615, side: BackSide }))
    studio.add(dome)
    for (const [w, h, position, intensity] of [[30, 8, [-8, 15, 12], 3], [18, 6, [10, 10, -12], 2], [8, 14, [-18, 4, -2], 1.4], [3, 16, [4, -3, 14], 2]]) {
      const panel = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(intensity, intensity * 0.97, intensity * 0.92) }))
      panel.position.set(...position)
      panel.lookAt(0, 0, 0)
      studio.add(panel)
    }
    const target = generator.fromScene(studio, 0.05)
    studio.traverse((o) => { o.geometry?.dispose(); o.material?.dispose() })
    cache.set(light, target)
    return target
  }
  return {
    get: (light) => environment(light).texture,
    dispose() { cache.forEach((target) => target.dispose()); generator.dispose() },
  }
}
