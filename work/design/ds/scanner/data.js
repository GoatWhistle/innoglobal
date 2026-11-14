const round = (n) => Math.round(n * 100) / 100
const dip = (x, center, width) => Math.exp(-(((x - center) / width) ** 2))

export function makePipeline(caseId = 1) {
  const lengthM = caseId === 1 ? 12000 : 8375
  const nominalMm = caseId === 1 ? 8 : 6
  const segments = Array.from({ length: Math.ceil(lengthM / 10) }, (_, id) => {
    const startM = id * 10, endM = Math.min(lengthM, startM + 10)
    const x = ((startM + endM) / 2) / lengthM
    const exposure = 0.36 + 0.21 * Math.sin(x * 24) ** 2 + 0.12 * Math.cos(x * 95) ** 2
    const loss = exposure + 2.7 * dip(x, 0.53, 0.048) + 1.3 * dip(x, 0.78, 0.06) + 0.7 * dip(x, 0.22, 0.035)
    const baselineMm = caseId === 1 ? round(nominalMm - loss * 0.5) : nominalMm
    const predictedMm = round(nominalMm - loss * (caseId === 1 ? 1 : 0.74))
    const spread = round(0.18 + exposure * 0.24)
    return { id, startM, endM, baselineMm, predictedMm, observedMm: caseId === 1 ? baselineMm : null,
      p10Mm: round(predictedMm - spread), p90Mm: round(predictedMm + spread),
      factors: { waterPercent: round(58 + exposure * 30), velocityMs: round(1.1 + dip(x, 0.53, 0.12) * 0.8) } }
  })
  return { id: `demo-${caseId}`, caseId, lengthM, nominalMm, diameterMm: caseId === 1 ? 530 : 325,
    baselineDate: caseId === 1 ? '2023-06-01' : '2018-09-01', targetDate: '2026-06-01', source: 'synthetic', segments }
}

export function priorityIds(pipeline) {
  return new Set([...pipeline.segments].sort((a, b) => a.predictedMm - b.predictedMm || a.id - b.id)
    .slice(0, Math.ceil(pipeline.segments.length * 0.1)).map((s) => s.id))
}

export function segmentAt(pipeline, meters) {
  const value = Number.isFinite(meters) ? meters : 0
  return Math.max(0, Math.min(pipeline.segments.length - 1, Math.floor(value / 10)))
}

export function makeExample(caseId, state = 'ready') {
  const pipeline = makePipeline(caseId)
  if (state === 'empty') pipeline.segments = []
  if (state === 'missing') for (const s of pipeline.segments) {
    s.observedMm = null; if (caseId === 1) s.baselineMm = null; s.p10Mm = null; s.p90Mm = null; s.factors = null
  }
  return pipeline
}
