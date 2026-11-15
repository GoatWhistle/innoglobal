import { describe, expect, it } from "vitest"
import { illustrativeAngle, illustrativeThickness } from "@/entities/pipe/wall-illustration"

describe("illustrative wall", () => {
  it.each([0, 0.2, 0.55, 1])("anchors the minimum to the forecast at position %s", (position) => {
    const minimum = 3.469
    expect(illustrativeThickness(8, minimum, position, illustrativeAngle(position))).toBeCloseTo(
      minimum,
      12,
    )
    const samples = Array.from({ length: 120 }, (_, i) =>
      illustrativeThickness(8, minimum, position, i / 10),
    )
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(minimum - 1e-12)
    expect(Math.max(...samples)).toBeLessThanOrEqual(8)
  })
  it("keeps nominal segments circular and joins the seam", () => {
    expect(illustrativeThickness(8, 8, 0.5, 6)).toBe(8)
    expect(illustrativeThickness(8, 4, 0.5, 0)).toBeCloseTo(
      illustrativeThickness(8, 4, 0.5, 12),
      12,
    )
  })
})
