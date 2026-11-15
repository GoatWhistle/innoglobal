import { expect, test } from "@playwright/test"
import common from "../src/shared/i18n/locales/ru/common.json" with { type: "json" }
import copy from "../src/shared/i18n/locales/ru/variants.json" with { type: "json" }
import { auditViolations } from "./axe-audit"

const url = "/dashboards?pipe=1250022871&segment=50&from=1108&to=2295"
test("dashboard persists edits, supports keyboard order and follows selection", async ({
  page,
}) => {
  await page.goto(url)
  await expect(page.locator("[data-tile]")).toHaveCount(3)
  await page.getByRole("button", { name: copy.dash.focus, exact: true }).click()
  expect(Number(new URL(page.url()).searchParams.get("from"))).toBeLessThan(500)
  await page.getByRole("button", { name: copy.dash.edit, exact: true }).click()
  const first = await page.locator("[data-tile]").first().getAttribute("data-tile")
  await page.getByRole("button", { name: copy.dash.move, exact: true }).first().focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.locator("[data-tile]").nth(1)).toHaveAttribute("data-tile", first ?? "")
  await page.getByRole("button", { name: copy.dash.undo, exact: true }).click()
  await expect(page.locator("[data-tile]").first()).toHaveAttribute("data-tile", first ?? "")
  await page
    .getByRole("textbox", { name: copy.dash.name, exact: true })
    .first()
    .fill("Inspection board")
  await page.getByRole("button", { name: copy.dash.done, exact: true }).click()
  await page.getByRole("button", { name: copy.dash.add, exact: true }).click()
  const panel = page.getByRole("complementary", { name: copy.dash.add })
  await panel.getByRole("button", { name: copy.dash.metric, exact: true }).click()
  await panel.getByRole("button", { name: copy.dash.add, exact: true }).click()
  await expect(page.locator("[data-tile]")).toHaveCount(4)
  await panel.getByRole("radio", { name: copy.dash.agent, exact: true }).click()
  await expect(panel.getByText(copy.dash.unavailable)).toBeVisible()
  await page.reload()
  await expect(page.locator("[data-tile]")).toHaveCount(4)
  await expect(
    page.getByRole("button", { name: `${copy.dash.board} Inspection board`, exact: true }),
  ).toBeVisible()
  await page.getByRole("button", { name: copy.dash.new, exact: true }).click()
  await expect(page.locator("[data-tile]")).toHaveCount(0)
  await page.getByRole("button", { name: copy.dash.undo, exact: true }).click()
  await expect(page.locator("[data-tile]")).toHaveCount(4)
})

for (const theme of ["light", "dark"]) {
  for (const width of [1440, 375]) {
    test(`dashboard layouts and accessibility ${theme} ${width}`, async ({ page }) => {
      test.skip(width === 375, "mobile layout is out of scope until the mobile-first pass")
      await page.addInitScript((value) => localStorage.setItem("app-theme", value), theme)
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(url)
      await expect(page.locator("[data-tile]")).toHaveCount(3)
      await expect(
        page.getByRole("navigation", { name: common.nav.breadcrumbs }).getByRole("link"),
      ).toHaveCount(2)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThan(2)
      await page.getByRole("button", { name: copy.dash.add, exact: true }).click()
      const panel = page.getByRole("complementary", { name: copy.dash.add })
      await expect(panel).toBeVisible()
      expect(await auditViolations(page)).toEqual([])
      await page.getByRole("button", { name: copy.dash.add, exact: true }).first().click()
      await expect(panel).not.toBeVisible()
    })
  }
}

test("editing supports drag cancellation, size changes and empty-dashboard deletion", async ({
  page,
}) => {
  await page.goto(url)
  await page.getByRole("button", { name: copy.dash.edit, exact: true }).click()
  const tiles = page.locator("[data-tile]")
  const firstId = await tiles.first().getAttribute("data-tile")
  const handle = page.getByRole("button", { name: copy.dash.move, exact: true }).first()
  const origin = await handle.boundingBox(),
    destination = await tiles.nth(2).boundingBox()
  expect(origin).not.toBeNull()
  expect(destination).not.toBeNull()
  if (!origin || !destination) return
  await page.mouse.move(origin.x + 10, origin.y + 10)
  await page.mouse.down()
  await page.mouse.move(destination.x + 20, destination.y + 20)
  await page.keyboard.press("Escape")
  await page.mouse.up()
  await expect(tiles.first()).toHaveAttribute("data-tile", firstId ?? "")
  await tiles
    .first()
    .getByRole("button", { name: `${copy.dash.size} XL`, exact: true })
    .click()
  await page.getByRole("option", { name: "M", exact: true }).click()
  await expect(tiles.first()).toHaveAttribute("style", /--span: 6/)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThan(2)
  await page.getByRole("button", { name: copy.dash.new, exact: true }).click()
  await page.getByRole("button", { name: copy.dash.delete, exact: true }).click()
  await page.getByRole("button", { name: copy.dash.confirm, exact: true }).click()
  await expect(tiles).toHaveCount(3)
  await page.getByRole("button", { name: copy.dash.delete, exact: true }).click()
  await page.getByRole("button", { name: copy.dash.confirm, exact: true }).click()
  await expect(tiles).toHaveCount(0)
})
