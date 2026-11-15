import { expect, type Page, test } from "@playwright/test"
import { auditViolations } from "./axe-audit"

const ROUTES = ["/", "/data", "/model", "/missing-page"]
const THEMES = ["light", "dark"] as const
const LOCALES = ["ru"] as const
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY)
      .every((animation) => animation.playState !== "running"),
  )
}

async function audit(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await expect(page.locator("#main h1")).toBeVisible()
  await settle(page)
  expect(await auditViolations(page, WCAG_TAGS), route).toEqual([])
}

for (const theme of THEMES) {
  for (const locale of LOCALES) {
    test(`axe ${theme} ${locale}`, async ({ page, context }) => {
      await context.addInitScript(
        ([chosenTheme, chosenLocale]) => {
          localStorage.setItem("app-theme", chosenTheme ?? "light")
          localStorage.setItem("app-locale", chosenLocale ?? "ru")
        },
        [theme, locale],
      )
      for (const route of ROUTES) {
        await audit(page, route)
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        await expect(page.locator("html")).toHaveAttribute("lang", locale)
      }
    })
  }
}
