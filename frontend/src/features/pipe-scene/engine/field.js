import { illustrativeThickness } from "@/entities/pipe"
export const HOURS = 48

export function wallAt(pipeline, segment, hour) {
  const position = (segment.startM + segment.endM) / 2 / pipeline.lengthM
  return illustrativeThickness(pipeline.nominalMm, segment.predictedMm, position, hour)
}

export function ring(pipeline, segment, count = 96) {
  return Array.from({ length: count }, (_, i) => wallAt(pipeline, segment, (i / count) * 12))
}

export function thinnest(pipeline) {
  return pipeline.segments.reduce((min, s) => Math.min(min, s.predictedMm), pipeline.nominalMm)
}

export function relative(pipeline, mm, floor = thinnest(pipeline)) {
  const span = Math.max(0.01, pipeline.nominalMm - floor)
  return Math.max(0, Math.min(1, (pipeline.nominalMm - mm) / span))
}

export function fieldData(pipeline) {
  const width = pipeline.segments.length,
    floor = thinnest(pipeline)
  const data = new Uint8Array(width * HOURS * 4)
  for (let h = 0; h < HOURS; h++)
    for (let i = 0; i < width; i++) {
      const value = relative(
        pipeline,
        wallAt(pipeline, pipeline.segments[i], (h / HOURS) * 12),
        floor,
      )
      const k = (h * width + i) * 4
      data[k] = Math.round(value * 255)
      data[k + 1] = 0
      data[k + 2] = 0
      data[k + 3] = 255
    }
  return { data, width, height: HOURS }
}
