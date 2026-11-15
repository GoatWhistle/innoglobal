import { ring } from "./field.js"
import { ANGLES, DIM, hourPoint } from "./geometry.js"
export function buildCap(pipeline, selected, span, capGeometry, oilGeometry, outline) {
  if (!pipeline?.segments[selected]) return
  const [, end] = span(),
    x = (end - 0.5) * DIM.L,
    values = ring(pipeline, pipeline.segments[selected], ANGLES)
  const wallScale = (DIM.R * 0.28) / pipeline.nominalMm
  const cp = capGeometry.attributes.position.array,
    op = oilGeometry.attributes.position.array
  const outer = outline[0].geometry.attributes.position.array,
    inner = outline[1].geometry.attributes.position.array
  op.set([x - 0.004, 0, 0], 0)
  for (let i = 0; i <= ANGLES; i++) {
    const j = i % ANGLES,
      hour = (j / ANGLES) * 12,
      r = DIM.R - values[j] * wallScale
    const a = hourPoint(0, hour, 0, DIM.R),
      b = hourPoint(0, hour, 0, r)
    cp.set([x + 0.001, a.y, a.z, x + 0.001, b.y, b.z], i * 6)
    op.set([x - 0.004, b.y, b.z], (i + 1) * 3)
    if (i < ANGLES) {
      outer.set([x + 0.002, a.y, a.z], i * 3)
      inner.set([x + 0.002, b.y, b.z], i * 3)
    }
  }
  for (const g of [capGeometry, oilGeometry, outline[0].geometry, outline[1].geometry]) {
    g.attributes.position.needsUpdate = true
    g.computeBoundingSphere()
  }
}
