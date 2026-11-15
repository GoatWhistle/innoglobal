import { DIM, hourPoint } from "./geometry.js"

export function annotationFrame(camera, width, height, pipeline, selected, mode, unroll, moving) {
  const project = (point) => {
    const p = point.project(camera)
    return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height }
  }
  const segment = pipeline.segments[selected]
  const u = (segment.startM + segment.endM) / 2 / pipeline.lengthM
  const point = hourPoint(mode === "section" ? segment.endM / pipeline.lengthM : u, 12, unroll)
  if (mode === "section") point.x = (segment.endM / pipeline.lengthM - 0.5) * DIM.L
  return {
    marker: project(point),
    moving,
    sheet: [project(hourPoint(0, 0, 1)), project(hourPoint(1, 12, 1))],
    flat: unroll > 0.98,
  }
}
