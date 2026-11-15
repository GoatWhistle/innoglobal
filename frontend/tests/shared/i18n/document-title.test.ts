import { describe, expect, it } from "vitest"
import { documentTitle, TITLE_SEPARATOR } from "@/shared/i18n"
import en from "@/shared/i18n/locales/en/common.json"
import ru from "@/shared/i18n/locales/ru/common.json"

describe("documentTitle", () => {
  it("puts the page first and the product second", () => {
    expect(documentTitle("Acme", "Orders")).toBe("Orders | Acme")
  })

  it("names the home page by the product alone", () => {
    expect(documentTitle("Acme", null)).toBe("Acme")
  })

  it.each([
    ["ru", ru],
    ["en", en],
  ])("keeps the %s home title short enough for a tab and a search result", (_, words) => {
    const title = documentTitle(words.app.name, null)
    expect(title).not.toContain(TITLE_SEPARATOR)
    expect(title).toBe(words.app.name)
    expect([...words.app.name].length).toBeLessThanOrEqual(24)
  })
})
