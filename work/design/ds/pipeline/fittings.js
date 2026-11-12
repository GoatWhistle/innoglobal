import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, TorusGeometry, Vector3 } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { DIM, frame, JOINTS, LENGTH, outerRadius, radial, SUPPORTS, toS } from "./route.js"
import { shell } from "./shell.js"

const Y = new Vector3(0, 1, 0)
const cast = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh }

function flanges(group, surfaces) {
  const thick = 0.08, gap = 0.014, bolts = 14, circle = 0.752
  const plates = [], hubs = [], seals = []
  const stud = new InstancedMesh(new CylinderGeometry(0.024, 0.024, thick * 2 + gap + 0.17, 10), surfaces.bolt, JOINTS.length * bolts)
  const nut = new InstancedMesh(new CylinderGeometry(0.05, 0.05, 0.048, 6), surfaces.bolt, JOINTS.length * bolts * 2)
  const matrix = new Matrix4(), turn = new Quaternion(), one = new Vector3(1, 1, 1)
  JOINTS.forEach((joint, index) => {
    const k = (v) => joint + v / LENGTH
    plates.push(shell({ s0: k(-gap / 2 - thick), s1: k(-gap / 2), inner: DIM.steel - 0.004, outer: 0.85, along: 1, round: 96 }))
    plates.push(shell({ s0: k(gap / 2), s1: k(gap / 2 + thick), inner: DIM.steel - 0.004, outer: 0.85, along: 1, round: 96 }))
    hubs.push(shell({ s0: k(-gap / 2 - thick - 0.1), s1: k(-gap / 2 - thick), inner: DIM.steel - 0.004, outer: DIM.steel + 0.055, along: 1, round: 96 }))
    hubs.push(shell({ s0: k(gap / 2 + thick), s1: k(gap / 2 + thick + 0.1), inner: DIM.steel - 0.004, outer: DIM.steel + 0.055, along: 1, round: 96 }))
    seals.push(shell({ s0: k(-gap / 2), s1: k(gap / 2), inner: DIM.steel, outer: 0.71, along: 1, round: 64 }))
    const f = frame(joint)
    turn.setFromUnitVectors(Y, f.tangent)
    for (let i = 0; i < bolts; i++) {
      const p = f.center.clone().addScaledVector(radial(f, (i + 0.5) / bolts * Math.PI * 2), circle)
      stud.setMatrixAt(index * bolts + i, matrix.compose(p, turn, one))
      for (const side of [-1, 1]) nut.setMatrixAt((index * bolts + i) * 2 + (side > 0 ? 1 : 0), matrix.compose(p.clone().addScaledVector(f.tangent, side * (gap / 2 + thick + 0.026)), turn, one))
    }
  })
  group.add(cast(new Mesh(mergeGeometries(plates), surfaces.machined)), cast(new Mesh(mergeGeometries(hubs), surfaces.machined)), cast(new Mesh(mergeGeometries(seals), surfaces.gasket)), cast(stud), cast(nut))
}

function supports(group, surfaces) {
  const saddles = []
  for (const s of SUPPORTS) {
    const f = frame(s), radius = outerRadius(s)
    saddles.push(shell({ s0: s - 0.27 / LENGTH, s1: s + 0.27 / LENGTH, a0: Math.PI - 0.9, a1: Math.PI + 0.9, inner: radius + 0.004, outer: radius + 0.05, along: 2 }))
    const top = DIM.axis - radius - 0.05, base = 0.15, height = top - base
    const post = new Group()
    post.position.set(f.center.x, 0, f.center.z)
    post.rotation.y = Math.atan2(-f.tangent.z, f.tangent.x)
    const box = (w, h, d, x, y, material) => { const m = cast(new Mesh(new BoxGeometry(w, h, d), material)); m.position.set(x, y, 0); post.add(m) }
    box(0.03, height, 0.3, 0, base + height / 2, surfaces.painted)
    box(0.26, height, 0.03, 0, base + height / 2, surfaces.painted)
    box(0.56, 0.04, 0.46, 0, top - 0.02, surfaces.painted)
    box(0.5, 0.03, 0.5, 0, base - 0.015, surfaces.painted)
    box(0.84, 0.12, 0.84, 0, 0.06, surfaces.concrete)
    group.add(post)
  }
  group.add(cast(new Mesh(mergeGeometries(saddles), surfaces.painted)))
}

function sensors(group, surfaces) {
  return Array.from({ length: 6 }, (_, i) => {
    const s = toS(i * 2400), f = frame(s), radius = outerRadius(s)
    const unit = new Group()
    const basis = new Matrix4().makeBasis(f.tangent, f.up, f.side)
    unit.quaternion.setFromRotationMatrix(basis)
    unit.position.copy(f.center)
    const part = (geometry, material, x, y, z) => { const m = cast(new Mesh(geometry, material)); m.position.set(x, y, z); unit.add(m); return m }
    part(new CylinderGeometry(0.03, 0.03, 0.34, 12), surfaces.bolt, 0, radius + 0.13, 0)
    part(new CylinderGeometry(0.062, 0.062, 0.07, 6), surfaces.bolt, 0, radius + 0.03, 0)
    part(new BoxGeometry(0.13, 0.1, 0.13), surfaces.machined, 0, radius + 0.32, 0)
    const head = part(new CylinderGeometry(0.135, 0.135, 0.2, 40), surfaces.housing, 0, radius + 0.5, 0)
    head.rotation.x = Math.PI / 2
    const status = new MeshStandardMaterial({ color: 0x6f6b65, roughness: 0.4, metalness: 0.2 })
    part(new TorusGeometry(0.118, 0.017, 12, 48), status, 0, radius + 0.5, 0.1)
    const face = new MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.12, metalness: 0 })
    part(new CircleGeometry(0.104, 40), face, 0, radius + 0.5, 0.102)
    group.add(unit)
    return { status, face, top: f.center.clone().addScaledVector(f.up, radius + 0.7), s }
  })
}

export function buildFittings(surfaces) {
  const group = new Group()
  flanges(group, surfaces)
  supports(group, surfaces)
  const list = sensors(group, surfaces)
  return {
    group, sensors: list,
    dispose() {
      group.traverse((o) => o.geometry?.dispose())
      for (const sensor of list) { sensor.status.dispose(); sensor.face.dispose() }
    },
  }
}
