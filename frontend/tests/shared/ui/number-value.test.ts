import { describe, expect, it } from "vitest"
import {
  atBound,
  decimalsOf,
  parseNumber,
  stepNumber,
} from "@/shared/ui/forms/number-field/number-value"
import { rovingIndex, typeaheadIndex } from "@/shared/ui/forms/select/listbox-keys"
import { placeLayer } from "@/shared/ui/overlays/layer-host/place"
import { addToast, TOAST_LIMIT } from "@/shared/ui/overlays/toast/toast-store"

describe("number values", () => {
  it("parses a decimal comma, grouping spaces and empty input", () => {
    expect(parseNumber("1 240,5")).toBe(1240.5)
    expect(parseNumber("6.42")).toBe(6.42)
    expect(parseNumber("")).toBeNull()
    expect(parseNumber("6,4x")).toBe("invalid")
  })

  it("steps within bounds and rounds to the step precision", () => {
    const bounds = { min: 0.5, max: 12, step: 0.1 }
    expect(decimalsOf(0.1)).toBe(1)
    expect(stepNumber(6.42, 0.1, bounds, 2)).toBe(6.52)
    expect(stepNumber(11.95, 1, bounds, 2)).toBe(12)
    expect(stepNumber(null, 0.1, bounds, 1)).toBe(0.6)
    expect(atBound(12, bounds, 1)).toBe(true)
    expect(atBound(12, bounds, -1)).toBe(false)
  })
})

describe("layer placement", () => {
  const viewport = { width: 400, height: 300 }
  const options = { align: "start", prefer: "bottom", gap: 4, edge: 8 } as const

  it("opens below the anchor and keeps inside the viewport", () => {
    const anchor = { top: 20, bottom: 64, left: 380, right: 420, width: 40 }
    const placed = placeLayer(anchor, { width: 200, height: 100 }, viewport, options)
    expect(placed.side).toBe("bottom")
    expect(placed.y).toBe(68)
    expect(placed.x).toBe(192)
  })

  it("flips above when there is no room below", () => {
    const anchor = { top: 240, bottom: 284, left: 10, right: 50, width: 40 }
    const placed = placeLayer(anchor, { width: 200, height: 100 }, viewport, options)
    expect(placed.side).toBe("top")
    expect(placed.y).toBe(136)
  })
})

describe("listbox keys and toasts", () => {
  it("wraps arrows and jumps with Home and End", () => {
    expect(rovingIndex("ArrowDown", 2, 3)).toBe(0)
    expect(rovingIndex("ArrowUp", 0, 3)).toBe(2)
    expect(rovingIndex("End", 0, 3)).toBe(2)
    expect(rovingIndex("a", 0, 3)).toBeNull()
  })

  it("cycles typeahead on a repeated letter and matches a typed prefix", () => {
    const labels = ["Oil", "Fuel", "Oil light"]
    expect(typeaheadIndex("o", labels, 0)).toBe(2)
    expect(typeaheadIndex("fu", labels, 0)).toBe(1)
  })

  it("keeps at most three live toasts by sending the oldest away", () => {
    const entries = [1, 2, 3, 4].reduce(
      (list, id) => addToast(list, { title: `T${id}` }, id),
      addToast([], { title: "T0" }, 0),
    )
    expect(entries.filter((entry) => !entry.leaving)).toHaveLength(TOAST_LIMIT)
    expect(entries.filter((entry) => entry.leaving).map((entry) => entry.id)).toEqual([0, 1])
  })
})
