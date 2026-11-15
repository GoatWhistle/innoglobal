import { expect, type Page, test } from "@playwright/test"
import common from "../src/shared/i18n/locales/ru/common.json" with { type: "json" }
import inspector from "../src/shared/i18n/locales/ru/inspector.json" with { type: "json" }
import pipe from "../src/shared/i18n/locales/ru/pipe.json" with { type: "json" }
import copy from "../src/shared/i18n/locales/ru/variants.json" with { type: "json" }

const SEGMENT_131 = "/?pipe=1250022871&segment=131"

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
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

async function openDetails(page: Page) {
  await page.getByRole("radio", { name: copy.segmentEvidence, exact: true }).click()
  await page.getByRole("button", { name: copy.segmentEvidence, exact: true }).click()
}

for (const theme of ["light", "dark"]) {
  test(`workspace fits and keeps evidence visible in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("app-theme", value), theme)
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of ["/data", "/model"]) {
        await page.goto(route)
        await expect(page.locator("#main h2").first()).toBeVisible()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        ).toBeLessThan(2)
      }
      await page.goto(SEGMENT_131)
      await expect(page.locator('[data-renderer="webgl"]')).toBeVisible()
      const bounds = await page.locator('[data-renderer="webgl"] canvas').boundingBox()
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(360)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThan(2)
      await expect(factsCard(page, 131)).toBeVisible()
      await page.getByRole("radio", { name: copy.segmentEvidence, exact: true }).click()
      const evidence = page.getByTestId("segment-facts")
      const link = evidence.getByRole("link", { name: copy.validationLink, exact: true })
      await expect(link).toBeVisible()
      const action = await link.boundingBox()
      const box = await evidence.boundingBox()
      expect((action?.x ?? 0) + (action?.width ?? 0)).toBeLessThanOrEqual(
        (box?.x ?? 0) + (box?.width ?? 0) + 1,
      )
    }
  })
}

test("mobile workspace fits at 375 and 768 px", async () => {
  test.skip(true, "mobile layout is out of scope until the mobile-first pass")
})

test("mobile queue traps focus, groups priorities and restores the trigger", async () => {
  test.skip(true, "queue drawer was replaced by the inline queue tab")
})

test("new segment details never display previous feature values", async ({ page }) => {
  await page.goto(SEGMENT_131)
  await openDetails(page)
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
  await pick(page, 184)
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
  await page.goto("/?pipe=1250009583&segment=3")
  await expect(factsCard(page, 3)).toContainText(copy.commissioned)
  await page.getByRole("radio", { name: copy.segmentEvidence, exact: true }).click()
  await page.getByRole("button", { name: copy.sources, exact: true }).click()
  await expect(page.getByTestId("segment-facts")).toContainText(copy.noVtd)
})

test("WebGL context loss preserves segment selection and facts", async ({ page }) => {
  await page.goto(SEGMENT_131)
  const scene = page.locator("[data-renderer]")
  await expect(scene).toHaveAttribute("data-renderer", "webgl")
  await scene
    .locator("canvas")
    .evaluate((canvas) => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })))
  await expect(scene).toHaveAttribute("data-renderer", "fallback")
  await expect(page.getByText(pipe.restoration.fallback, { exact: true })).toBeVisible()
  await pick(page, 184)
  await expect(page).toHaveURL(/segment=184/)
  await expect(factsCard(page, 184)).toContainText("3,11")
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
  await page.goto(SEGMENT_131)
  await openDetails(page)
  await expect(page.getByRole("button", { name: common.action.retry, exact: true })).toBeVisible()
  await expect(factsCard(page, 131)).toContainText("2,90")
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible()
  failed = false
  await page.getByRole("button", { name: common.action.retry, exact: true }).click()
  await expect(page.getByText(copy.noFeatures, { exact: true })).toBeVisible()
})
