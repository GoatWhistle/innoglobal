import { Group, Mesh } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { CUT, DIM, GAP, JOINTS, LENGTH } from "./route.js"
import { shell } from "./shell.js"

const TAU = Math.PI * 2

function runs(cut) {
  const [a, b] = JOINTS
  return [[0, a - GAP], [a + GAP, cut[0]], [cut[1], b - GAP], [b + GAP, 1]]
}

function rings(list, width, inner, outer) {
  return mergeGeometries(list.map((s) => shell({ s0: s - width / LENGTH, s1: s + width / LENGTH, inner, outer, along: 1, round: 96 })))
}

export function buildPipe(surfaces, oil) {
  const group = new Group()
  function add(geometry, material) {
    const mesh = new Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const bore = DIM.steel - DIM.wall
  const jacketRuns = runs(CUT.jacket), woolRuns = runs(CUT.wool)
  const jacket = add(mergeGeometries(jacketRuns.map(([s0, s1]) => shell({ s0, s1, inner: DIM.wool + 0.003, outer: DIM.jacket, inside: false }))), surfaces.jacket)
  const wool = add(mergeGeometries(woolRuns.map(([s0, s1]) => shell({ s0, s1, inner: DIM.steel + 0.004, outer: DIM.wool, inside: false }))), surfaces.wool)
  const [open, close] = CUT.steel
  const steel = add(mergeGeometries([
    shell({ s0: 0, s1: open, inner: bore, outer: DIM.steel }),
    shell({ s0: open, s1: close, inner: bore, outer: DIM.steel, a0: CUT.sector[1], a1: CUT.sector[0] + TAU, capStart: false, capEnd: false }),
    shell({ s0: close, s1: 1, inner: bore, outer: DIM.steel }),
  ]), surfaces.steel)
  const fill = bore - 0.004
  const liquid = add(mergeGeometries([
    shell({ s0: 0.0015, s1: open, inner: 0, outer: fill, round: 96 }),
    shell({ s0: close, s1: 0.9985, inner: 0, outer: fill, round: 96 }),
  ]), oil.body)
  const section = add(shell({ s0: open, s1: close, inner: 0, outer: fill, a0: CUT.sector[1], a1: CUT.sector[0] + TAU, capStart: false, capEnd: false, along: 140 }), oil.section)
  liquid.castShadow = false
  section.castShadow = false
  const straps = [], collars = []
  for (const [s0, s1] of jacketRuns) {
    const count = Math.max(1, Math.round((s1 - s0) * LENGTH / 1.25))
    for (let i = 1; i < count; i++) straps.push(s0 + (s1 - s0) * i / count)
    if (s0 > 0) collars.push(s0 + 0.05 / LENGTH)
    if (s1 < 1) collars.push(s1 - 0.05 / LENGTH)
  }
  add(rings(straps, 0.028, DIM.jacket - 0.004, DIM.jacket + 0.009), surfaces.band)
  add(rings(collars, 0.05, DIM.jacket - 0.004, DIM.jacket + 0.014), surfaces.band)
  add(rings([CUT.wool[0] + 0.2 / LENGTH, CUT.wool[1] - 0.2 / LENGTH, ...JOINTS.flatMap((j) => [j - 0.2 / LENGTH, j + 0.2 / LENGTH])], 0.024, DIM.steel - 0.004, DIM.steel + 0.013), surfaces.weld)
  return {
    group, liquid, targets: [jacket, wool, steel, liquid, section],
    dispose() { group.traverse((o) => o.geometry?.dispose()) },
  }
}
