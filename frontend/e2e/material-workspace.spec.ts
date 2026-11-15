import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import common from "../src/shared/i18n/locales/ru/common.json" with { type: "json" }
import model from "../src/shared/i18n/locales/ru/model.json" with { type: "json" }
import pipe from "../src/shared/i18n/locales/ru/pipe.json" with { type: "json" }
import copy from "../src/shared/i18n/locales/ru/variants.json" with { type: "json" }

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
})

async function expectModelNameFits(page: Page) {
  const name = await page
    .getByText(model.selected, { exact: true })
    .first()
    .locator("..")
    .boundingBox()
  const metric = await page.getByText(model.r2, { exact: true }).first().boundingBox()
  expect(metric?.y ?? 0).toBeGreaterThanOrEqual((name?.y ?? 0) + (name?.height ?? 0))
}

for (const theme of ["light", "dark"]) {
  test(`workspace fits and keeps evidence visible in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("app-theme", value), theme)
    await page.goto("/?pipe=1250022871&segment=131")
    await expect(page.locator('[data-renderer="webgl"]')).toBeVisible()
    const chart = page.locator('[data-track="forecast"]')
    await expect(chart).toBeVisible()
    const bounds = await page.locator("canvas").first().boundingBox()
    expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(360)
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThan(2)
      for (const route of ["/data", "/model"]) {
        await page.goto(route)
        await expect(page.locator("#main h2").first()).toBeVisible()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        ).toBeLessThan(2)
        if (route === "/model" && width === 375) {
          await expectModelNameFits(page)
        }
      }
      await page.goto("/?pipe=1250022871&segment=131")
      await expect(page.locator('[data-renderer="webgl"]')).toBeVisible()
      const action = await page
        .getByRole("link", { name: copy.validationLink, exact: true })
        .boundingBox()
      const evidence = await page.getByTestId("segment-facts").boundingBox()
      expect((action?.x ?? 0) + (action?.width ?? 0)).toBeLessThanOrEqual(
        (evidence?.x ?? 0) + (evidence?.width ?? 0) + 1,
      )
    }
  })
}

test("mobile queue traps focus, groups priorities and restores the trigger", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto("/?pipe=1250022871&segment=131")
  const trigger = page.getByRole("button", { name: copy.queue, exact: true })
  await trigger.focus()
  await page.keyboard.press("Enter")
  const drawer = page.getByRole("dialog")
  await expect(drawer).toBeVisible()
  await drawer.getByRole("radio", { name: copy.groups, exact: true }).check()
  await expect(drawer.getByRole("button", { name: /1\s290–1\s370/ })).toBeVisible()
  const audit = await new AxeBuilder({ page }).include("dialog").analyze()
  expect(audit.violations).toEqual([])
  await page.keyboard.press("Escape")
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test("new segment details never display previous feature values", async ({ page }) => {
  await page.goto("/?pipe=1250022871&segment=131")
  await page.getByRole("button", { name: copy.segmentEvidence, exact: true }).click()
  const values = page.getByTestId("segment-evidence-values")
  await expect(values).toHaveAttribute("data-segment", "131")
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/segments/184", async (route) => {
    const response = await route.fetch()
    await gate
    await route.fulfill({ response })
  })
  const input = page.getByRole("textbox", { name: pipe.restoration.coordinate, exact: true })
  await input.fill("1840")
  await page.getByRole("button", { name: pipe.restoration.go, exact: true }).click()
  await expect(page).toHaveURL(/segment=184/)
  await expect(values).toHaveCount(0)
  release()
  await expect(values).toHaveAttribute("data-segment", "184")
})

test("priority export uses the selected pipe and nominal-only pipe keeps its evidence", async ({
  page,
  request,
}) => {
  for (const id of [1250022871, 1250009583]) {
    await page.goto(`/?pipe=${id}`)
    const link = page.getByRole("link", { name: copy.exportPriorities, exact: true })
    await expect(link).toHaveAttribute("href", `/api/v1/pipes/${id}/priorities.csv`)
    const csv = await request.get(`/api/v1/pipes/${id}/priorities.csv`)
    expect(csv.ok()).toBeTruthy()
    const rows = (await csv.text()).trim().split("\n")
    expect(rows[0]).toBe("rank,id,segment_id,start_m,end_m,thickness_pred,p10,p90")
    expect(rows.slice(1).every((row) => row.split(",")[1] === String(id))).toBeTruthy()
  }
  await expect(page.getByTestId("segment-facts")).toContainText(copy.nominalBase)
})

test("WebGL context loss preserves coordinate selection and profile", async ({ page }) => {
  await page.goto("/?pipe=1250022871&segment=131")
  const scene = page.locator("[data-renderer]")
  await expect(scene).toHaveAttribute("data-renderer", "webgl")
  await scene
    .locator("canvas")
    .evaluate((canvas) => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })))
  await expect(scene).toHaveAttribute("data-renderer", "fallback")
  await page.getByRole("textbox", { name: pipe.restoration.coordinate, exact: true }).fill("1840")
  await page.getByRole("button", { name: pipe.restoration.go, exact: true }).click()
  await expect(page).toHaveURL(/segment=184/)
  await expect(page.locator('[data-track="forecast"]')).toBeVisible()
  await expect(page.getByTestId("forecast-value")).toContainText("3,12")
})

test("detail failure is isolated and retry can recover to an empty evidence state", async ({
  page,
}) => {
  let failed = true
  await page.route("**/segments/131", async (route) => {
    if (failed) {
      await route.fulfill({ status: 404, json: { error: { code: "segment_not_found" } } })
      return
    }
    const response = await route.fetch()
    const data = await response.json()
    await route.fulfill({ response, json: { ...data, features: [] } })
  })
  await page.goto("/?pipe=1250022871&segment=131")
  await page.getByRole("button", { name: copy.segmentEvidence, exact: true }).click()
  await expect(page.getByRole("button", { name: common.action.retry, exact: true })).toBeVisible()
  await expect(page.getByTestId("forecast-value")).toContainText("2,90")
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible()
  failed = false
  await page.getByRole("button", { name: common.action.retry, exact: true }).click()
  await expect(page.getByText(copy.noFeatures, { exact: true })).toBeVisible()
})
