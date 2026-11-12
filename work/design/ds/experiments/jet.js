import { CatmullRomCurve3, Group, InstancedMesh, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3 } from "three"
import { flowGeometry } from "./geometry.js"
import { fluidMaterial } from "./material.js"

export function createJet(position, normal, radius) {
  const group = new Group()
  const length = radius * 3.2
  const points = Array.from({ length: 6 }, (_, i) => {
    const k = i / 5
    return position.clone().addScaledVector(normal, radius * 0.5 * k).add(new Vector3(0, -length * k * k, 0))
  })
  const curve = new CatmullRomCurve3(points)
  const geometry = flowGeometry(curve, radius * 0.21, 48)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const u = geometry.attributes.uv.getX(i)
    const center = curve.getPointAt(u)
    const p = new Vector3().fromBufferAttribute(positions, i)
    p.sub(center).multiplyScalar(1 - 0.65 * u).add(center)
    positions.setXYZ(i, p.x, p.y, p.z)
  }
  geometry.computeVertexNormals()
  const oil = fluidMaterial()
  oil.material.envMapIntensity = 2
  oil.material.clearcoatRoughness = 0.15
  oil.material.transparent = true
  const strand = new Mesh(geometry, oil.material)
  const drops = new InstancedMesh(new SphereGeometry(1, 16, 12), oil.material, 3)
  drops.geometry.setAttribute("aFlow", drops.geometry.attributes.normal.clone())
  drops.frustumCulled = false
  group.add(strand, drops)
  const end = points.at(-1)
  const matrix = new Matrix4(), rotation = new Quaternion()
  let birth = null
  return {
    group,
    update(clock, age, fade, reduced) {
      birth ??= clock
      oil.uniforms.uTime.value = clock
      oil.uniforms.uFade.value = fade
      oil.uniforms.uReveal.value = reduced ? 2 : Math.min(1.01, (clock - birth) / 0.8)
      drops.visible = reduced || clock - birth > 0.8
      for (let i = 0; i < 3; i++) {
        const k = reduced ? 0.35 + i * 0.22 : ((clock - birth) * 0.42 + i / 3) % 1
        const r = radius * (0.085 + 0.035 * Math.sin(k * Math.PI)) * fade
        const p = end.clone().add(new Vector3(0, -radius * 1.4 * k * k, 0))
        matrix.compose(p, rotation, new Vector3(r, r * (1.5 + k), r))
        drops.setMatrixAt(i, matrix)
      }
      drops.instanceMatrix.needsUpdate = true
    },
    dispose() { geometry.dispose(); drops.geometry.dispose(); oil.material.dispose() },
  }
}
