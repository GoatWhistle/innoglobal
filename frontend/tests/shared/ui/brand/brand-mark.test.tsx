import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { i18n } from "@/shared/i18n"
import en from "@/shared/i18n/locales/en/common.json"
import ru from "@/shared/i18n/locales/ru/common.json"
import { BRAND_MARK_STATES, BrandMark } from "@/shared/ui"
import {
  MARK_ACCENT_PATH,
  MARK_BASE_PATH,
  MARK_VIEW_BOX,
  WORDMARK_VIEW_BOX,
  WORDMARK_WORD_PATH,
} from "@/shared/ui/brand/brand-mark/brand-geometry.gen"

const mark = () => screen.getByRole("img", { name: ru.app.name })
const stroke = (name: string) => mark().querySelector(`[data-stroke="${name}"]`)

describe("BrandMark", () => {
  it("draws the two strokes of the symbol, named by the product name", () => {
    render(<BrandMark />)
    expect(mark().getAttribute("viewBox")).toBe(MARK_VIEW_BOX)
    expect(stroke("base")?.getAttribute("d")).toBe(MARK_BASE_PATH)
    expect(stroke("accent")?.getAttribute("d")).toBe(MARK_ACCENT_PATH)
    expect(mark().querySelector(`path[d="${WORDMARK_WORD_PATH}"]`)).toBeNull()
  })

  it("renders the outlined wordmark with the same strokes in the lockup", () => {
    render(<BrandMark variant="lockup" />)
    expect(mark().getAttribute("viewBox")).toBe(WORDMARK_VIEW_BOX)
    expect(mark().querySelector(`path[d="${WORDMARK_WORD_PATH}"]`)).not.toBeNull()
    expect(stroke("base")).not.toBeNull()
    expect(stroke("accent")).not.toBeNull()
  })

  it("follows the interface language in its accessible name", async () => {
    render(<BrandMark />)
    await act(() => i18n.changeLanguage("en"))
    expect(screen.getByRole("img", { name: en.app.name })).toBeTruthy()
  })

  it.each(BRAND_MARK_STATES)("exposes the %s state as a class and a data attribute", (state) => {
    render(<BrandMark state={state} />)
    expect(mark().dataset.state).toBe(state)
    expect(mark().classList.contains(state)).toBe(true)
    for (const other of BRAND_MARK_STATES.filter((name) => name !== state))
      expect(mark().classList.contains(other)).toBe(false)
  })

  it("reveals on mount by default and can render settled", () => {
    const { rerender } = render(<BrandMark />)
    expect(mark().dataset.state).toBe("identity")
    expect(mark().classList.contains("reveal")).toBe(true)
    rerender(<BrandMark reveal={false} />)
    expect(mark().classList.contains("reveal")).toBe(false)
    expect(mark().dataset.reveal).toBeUndefined()
  })

  it("keeps the accent stroke element across state changes so the move is a transition", () => {
    const { rerender } = render(<BrandMark state="calm" />)
    const accent = stroke("accent")
    rerender(<BrandMark state="alarm" />)
    expect(stroke("accent")).toBe(accent)
    expect(mark().classList.contains("alarm")).toBe(true)
  })
})
