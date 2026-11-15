import { expect, test } from "@playwright/test"
import pipeCopy from "../src/shared/i18n/locales/ru/pipe.json" with { type: "json" }
import copy from "../src/shared/i18n/locales/ru/variants.json" with { type: "json" }

for (const theme of ["light", "dark"]) {
  for (const width of [375, 1440]) {
    test(`main 3d workspace ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.addInitScript((value) => localStorage.setItem("app-theme", value), theme)
      await page.goto("/?pipe=1250022871&segment=130")
      const scene = page.locator("[data-renderer]")
      await expect(scene).toHaveAttribute("data-renderer", "webgl")
      for (const mode of ["route", "unroll", "section"] as const) {
        await page.getByRole("radio", { name: pipeCopy.scene[mode], exact: true }).click()
        await expect(scene).toHaveAttribute("data-mode", mode)
        if (mode !== "route") await expect(page).toHaveURL(new RegExp(`view=${mode}`))
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        ).toBeLessThan(2)
        await page.screenshot({
          path: `../work/audits/material-workspace/regression-${theme}-${width}-${mode}.png`,
          fullPage: true,
          animations: "disabled",
        })
      }
      await page.reload()
      await expect(scene).toHaveAttribute("data-mode", "section")
      await expect(page.locator('img[src*="steel-elevation"]')).toHaveCount(0)
    })
  }
}

test("existing cut controls, baseline and unroll picking share the selected segment", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/?pipe=1250022871&segment=130")
  const scene = page.locator("[data-renderer]")
  await expect(scene).toHaveAttribute("data-renderer", "webgl")
  await page.getByRole("radio", { name: pipeCopy.scene.section, exact: true }).click()
  await page
    .getByRole("textbox", { name: pipeCopy.restoration.coordinate, exact: true })
    .fill("2710")
  await page.getByRole("button", { name: pipeCopy.restoration.go, exact: true }).click()
  await expect(page).toHaveURL(/segment=271/)
  await expect(scene).toHaveAttribute("data-mode", "section")
  const response = await request.get("/api/v1/pipes/1250022871/segments/271")
  expect(response.ok()).toBeTruthy()
  const detail = await response.json()
  const expected = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(detail.segment.forecast_mm)
  await expect(page.getByTestId("forecast-value")).toContainText(expected)
  await page.getByRole("button", { name: new RegExp(`^${copy.baseline}`) }).click()
  await page.getByRole("option", { name: /2018/ }).click()
  await expect(page.getByTestId("segment-facts")).toContainText("2018")
  await page.getByRole("radio", { name: pipeCopy.scene.unroll, exact: true }).click()
  await scene.locator("canvas").click()
  await expect(scene).toHaveAttribute("data-mode", "section")
  await page.getByRole("button", { name: pipeCopy.restoration.go, exact: true }).focus()
  await page.keyboard.press("1")
  await expect(scene).toHaveAttribute("data-mode", "route")
  await page.keyboard.press("3")
  await expect(scene).toHaveAttribute("data-mode", "section")
})
