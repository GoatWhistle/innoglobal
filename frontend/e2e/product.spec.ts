import { mkdirSync } from "node:fs"
import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import common from "../src/shared/i18n/locales/ru/common.json" with { type: "json" }
import inspector from "../src/shared/i18n/locales/ru/inspector.json" with { type: "json" }
import modelCopy from "../src/shared/i18n/locales/ru/model.json" with { type: "json" }
import overviewCopy from "../src/shared/i18n/locales/ru/overview.json" with { type: "json" }
import pipeCopy from "../src/shared/i18n/locales/ru/pipe.json" with { type: "json" }
import priorityCopy from "../src/shared/i18n/locales/ru/priorities.json" with { type: "json" }
import sectionCopy from "../src/shared/i18n/locales/ru/section.json" with { type: "json" }

const pipes = [1250022871, 1250009583]
const out = "../work/audits/full-product/screenshots"
mkdirSync(out, { recursive: true })

async function checkSurface(page: Page) {
  await page.mouse.move(0, 0)
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.effect?.getTiming().iterations === Number.POSITIVE_INFINITY ||
          animation.playState !== "running",
      ),
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
  expect(await page.locator("body").innerText()).not.toContain("{{")
}

for (const width of [375, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`product ${width} ${theme}`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript((chosen) => localStorage.setItem("app-theme", chosen), theme)
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      for (const pipe of pipes) {
        const result = await request.get(`/api/v1/pipes/${pipe}/priorities`)
        expect(result.ok()).toBeTruthy()
        const priorities = await result.json()
        const segment = priorities.items[0].segment_id
        await page.goto(`/pipes/${pipe}?segment=${segment}`)
        await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", String(segment))
        await expect(
          page.getByRole("heading", {
            name: inspector.title.replace("{{segment}}", String(segment)),
            exact: true,
          }),
        ).toBeVisible()
        const detail = await (await request.get(`/api/v1/pipes/${pipe}/segments/${segment}`)).json()
        const value = new Intl.NumberFormat("ru-RU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(detail.segment.forecast_mm)
        await expect(page.locator("main")).toContainText(value)
        await page.getByRole("slider").focus()
        await page.keyboard.press("End")
        const profile = await (await request.get(`/api/v1/pipes/${pipe}/profile`)).json()
        await expect(
          page.getByRole("heading", {
            name: inspector.title.replace("{{segment}}", String(profile.rows.length - 1)),
            exact: true,
          }),
        ).toBeVisible()
        await page.keyboard.press("Home")
        await expect(
          page.getByRole("heading", {
            name: inspector.title.replace("{{segment}}", "0"),
            exact: true,
          }),
        ).toBeVisible()
        await page.getByRole("radio", { name: pipeCopy.scene.section, exact: true }).click()
        await expect(page.getByRole("img", { name: sectionCopy.label })).toBeVisible()
        await checkSurface(page)
        await page.screenshot({ path: `${out}/pipe-${pipe}-${width}-${theme}.png`, fullPage: true })
        await page.goto(`/pipes/${pipe}/priorities`)
        await expect(page.getByRole("table")).toBeVisible()
        await checkSurface(page)
        const download = page.waitForEvent("download")
        await page.getByRole("link", { name: priorityCopy.export }).click()
        expect((await download).suggestedFilename()).toContain(String(pipe))
        await page
          .getByRole("link", { name: new RegExp(priorityCopy.open.split("{{")[0] ?? "") })
          .first()
          .click()
        await expect(page.getByRole("slider")).toBeVisible()
      }
      for (const route of ["/", "/data", "/model", "/missing-page"]) {
        await page.goto(route)
        await expect(page.locator("#main h1")).toBeVisible()
        await page.waitForLoadState("networkidle")
        if (route === "/model") {
          await expect(page.getByRole("img", { name: modelCopy.comparison.label })).toBeVisible()
          await expect(
            page.getByText(modelCopy.comparison.unavailable, { exact: true }),
          ).toBeVisible()
          await page
            .getByRole("radio", { name: modelCopy.comparison.tableTab, exact: true })
            .check()
          await expect(
            page.getByRole("table", { name: modelCopy.comparison.table }).locator("tbody tr"),
          ).toHaveCount(55)
          await page.getByRole("radio", { name: modelCopy.comparison.chart, exact: true }).check()
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy()
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
        expect(
          axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        ).toEqual([])
        await page.screenshot({
          path: `${out}/${route.replaceAll("/", "") || "overview"}-${width}-${theme}.png`,
          fullPage: true,
        })
      }
      expect(errors).toEqual([])
    })
  }
}

test("API outage is retryable", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort())
  await page.goto("/")
  await expect(page.getByRole("button", { name: common.action.retry }).first()).toBeVisible({
    timeout: 20000,
  })
  await page.unroute("**/api/v1/**")
  await page.getByRole("button", { name: common.action.retry }).first().click()
  await expect(page.getByRole("link", { name: overviewCopy.open }).first()).toBeVisible()
})

test("reduced motion and unavailable WebGL keep selection usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind.includes("webgl")) return null
      return Reflect.apply(original, this, [kind, ...args])
    } as typeof original
  })
  await page.goto(`/pipes/${pipes[0]}?segment=10`)
  await page.getByRole("slider").focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", "11")
  await page.getByRole("radio", { name: pipeCopy.scene.section, exact: true }).click()
  await expect(page.getByRole("img", { name: sectionCopy.label })).toBeVisible()
})

test("navigation remembers the selected pipe", async ({ page }) => {
  await page.goto(`/pipes/${pipes[1]}`)
  await expect(page.getByRole("slider")).toBeVisible()
  await page
    .getByRole("navigation", { name: common.nav.label })
    .getByRole("link", { name: common.nav.overview })
    .click()
  await page
    .getByRole("navigation", { name: common.nav.label })
    .getByRole("link", { name: common.nav.priorities })
    .click()
  await expect(page).toHaveURL(new RegExp(`/pipes/${pipes[1]}/priorities$`))
  await expect(page.getByRole("table")).toBeVisible()
})
