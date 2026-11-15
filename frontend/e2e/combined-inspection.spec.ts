import { expect, type Page, test } from "@playwright/test"
import inspector from "../src/shared/i18n/locales/ru/inspector.json" with { type: "json" }
import pipeCopy from "../src/shared/i18n/locales/ru/pipe.json" with { type: "json" }
import copy from "../src/shared/i18n/locales/ru/variants.json" with { type: "json" }

const PIPE = "/?pipe=1250022871"
const decimal = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function factsCard(page: Page, segment: number) {
  const heading = page.getByRole("heading", {
    name: inspector.title.replace("{{segment}}", String(segment)),
    exact: true,
  })
  return page.locator("section").filter({ has: heading }).last()
}

async function pick(page: Page, segment: number) {
  const field = page.getByLabel(copy.workspace.edit, { exact: true })
  await field.fill(String(segment))
  await field.press("Enter")
}

for (const theme of ["light", "dark"]) {
  for (const width of [375, 1440]) {
    test(`main 3d workspace ${theme} ${width}`, async ({ page }) => {
      test.skip(width === 375, "mobile layout is out of scope until the mobile-first pass")
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.addInitScript((value) => localStorage.setItem("app-theme", value), theme)
      await page.goto(`${PIPE}&segment=130`)
      const scene = page.locator('[data-renderer="webgl"]')
      const grid = page.getByRole("slider", { name: copy.workspace.surface, exact: true })
      await expect(scene).toBeVisible()
      for (const mode of ["unroll", "route"] as const) {
        const label = mode === "route" ? copy.pipe : pipeCopy.scene.unroll
        await page.getByRole("radio", { name: label, exact: true }).click()
        await expect(page).toHaveURL(new RegExp(`view=${mode}`))
        await expect(mode === "route" ? scene : grid).toBeVisible()
        await expect(mode === "route" ? grid : scene).toHaveCount(0)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        ).toBeLessThan(2)
        await page.screenshot({
          path: `../work/audits/material-workspace/regression-${theme}-${width}-${mode}.png`,
          animations: "disabled",
        })
      }
      await page.getByRole("radio", { name: pipeCopy.scene.unroll, exact: true }).click()
      await page.reload()
      await expect(grid).toBeVisible()
      await expect(grid).toHaveAttribute("aria-valuenow", "130")
      await expect(page.locator('img[src*="steel-elevation"]')).toHaveCount(0)
    })
  }
}

test("segment picker, queue rows and unroll picking share the selected segment", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`${PIPE}&segment=130`)
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible()
  await pick(page, 271)
  await expect(page).toHaveURL(/segment=271/)
  const response = await request.get("/api/v1/pipes/1250022871/segments/271")
  expect(response.ok()).toBeTruthy()
  const detail = await response.json()
  await expect(factsCard(page, 271)).toContainText(decimal.format(detail.segment.forecast_mm))
  await page.getByRole("button", { name: copy.nextArea, exact: true }).click()
  await expect(page).toHaveURL(/segment=272/)
  await expect(factsCard(page, 272)).toBeVisible()
  const csv = await request.get("/api/v1/pipes/1250022871/priorities.csv")
  const top = (await csv.text()).trim().split("\n")[1]?.split(",")[2]
  const firstRow = page.locator("li > button[aria-pressed]").first()
  await expect(firstRow).toHaveAttribute("aria-pressed", "false")
  await firstRow.click()
  await expect(page).toHaveURL(new RegExp(`segment=${top}(&|$)`))
  await expect(firstRow).toHaveAttribute("aria-pressed", "true")
  await expect(factsCard(page, Number(top))).toBeVisible()
  await page.getByRole("radio", { name: pipeCopy.scene.unroll, exact: true }).click()
  const grid = page.getByRole("slider", { name: copy.workspace.surface, exact: true })
  await expect(grid).toHaveAttribute("aria-valuenow", String(top))
  await grid.focus()
  await page.keyboard.press("ArrowRight")
  await expect(page).toHaveURL(new RegExp(`segment=${Number(top) + 1}(&|$)`))
  await grid.click({ position: { x: 66, y: 5 } })
  await expect(page).toHaveURL(/segment=0(&|$)/)
  await expect(grid).toHaveAttribute("aria-valuenow", "0")
  await expect(factsCard(page, 0)).toBeVisible()
})
