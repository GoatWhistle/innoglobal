import { BufferAttribute, CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, TorusGeometry, TubeGeometry, Vector3 } from "three"
import { fluidMaterial, shellMaterial } from "./material.js"
import { toProgress, VARIANTS } from "./paths.js"

export function flowGeometry(curve, radius, segments = 160) {
  const geometry = new TubeGeometry(curve, segments, radius, 48, false)
  const vectors = new Float32Array(geometry.attributes.position.count * 3)
  for (let i = 0; i <= segments; i++) {
    const tangent = curve.getTangentAt(i / segments)
    for (let j = 0; j <= 48; j++) tangent.toArray(vectors, (i * 49 + j) * 3)
  }
  geometry.setAttribute("aFlow", new BufferAttribute(vectors, 3))
  return geometry
}

export function buildObject(id) {
  const config = VARIANTS[id]
  const curve = new CatmullRomCurve3(config.points.map((p) => new Vector3(...p)), false, "centripetal")
  const group = new Group()
  const shell = shellMaterial(config)
  const oil = fluidMaterial()
  const body = new Mesh(flowGeometry(curve, config.radius), shell.material)
  const liquid = new Mesh(flowGeometry(curve, config.radius * 0.965), oil.material)
  group.add(body, liquid)
  const sensors = Array.from({ length: 6 }, (_, i) => {
    const u = i / 5
    const position = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u)
    const geometry = new TorusGeometry(config.radius * 1.025, config.radius * 0.035, 8, 64)
    const material = new MeshStandardMaterial({ color: 0x69645d, roughness: 0.55, metalness: 0.25 })
    const ring = new Mesh(geometry, material)
    ring.position.copy(position)
    ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), tangent)
    group.add(ring)
    return ring
  })
  function surface(m, camera) {
    const u = toProgress(m)
    const center = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u)
    const normal = camera.position.clone().sub(center)
    normal.addScaledVector(tangent, -normal.dot(tangent)).normalize()
    return { position: center.addScaledVector(normal, config.radius), normal, tangent }
  }
  function dispose() {
    group.traverse((o) => {
      o.geometry?.dispose()
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
      else o.material?.dispose()
    })
  }
  return { group, curve, config, body, liquid, oil, shell, sensors, surface, dispose }
}
