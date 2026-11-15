import { expect, test } from "@playwright/test"
import ru from "../src/shared/i18n/locales/ru/assistant.json" with { type: "json" }
import inspector from "../src/shared/i18n/locales/ru/inspector.json" with { type: "json" }
import variants from "../src/shared/i18n/locales/ru/variants.json" with { type: "json" }

const endpoint = "**/api/v1/assistant"
const event = (type: string, extra = {}) =>
  JSON.stringify({ type, text: "", code: "", actions: [], values: [], ...extra })

test("retains the submitted context when the segment changes during a response", async ({
  page,
}) => {
  let finish: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  await page.route(endpoint, async (route) => {
    expect(route.request().postDataJSON().context.segment_id).toBe(130)
    await gate
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: `${event("delta", { text: "Segment 130 evidence" })}\n${event("evidence", { actions: [{ kind: "source", segment_ids: [130], source: "segment" }] })}\n${event("done")}\n`,
    })
  })
  await page.goto("/?pipe=1250022871&segment=130")
  await page.getByRole("button", { name: ru.title, exact: true }).click()
  await page.getByRole("button", { name: ru.prompts.priority, exact: true }).click()
  await page
    .getByRole("button", { name: inspector.title.replace("{{segment}}", "130"), exact: true })
    .hover()
  await page.getByLabel(variants.workspace.edit, { exact: true }).fill("131")
  await page.getByLabel(variants.workspace.edit, { exact: true }).press("Enter")
  await page.mouse.move(0, 0)
  finish?.()
  const answer = page.getByTestId("assistant-answer")
  await expect(answer).toContainText("Segment 130 evidence")
  await expect(page).toHaveURL(/segment=131/)
  await answer.getByRole("button", { name: ru.actions.source, exact: true }).click()
  await expect(page).toHaveURL(/segment=130/)
  await expect(page.getByRole("dialog")).toBeVisible()
})

test("shows request errors and retries against the backend contract", async ({ page }) => {
  let requests = 0
  await page.route(endpoint, (route) => {
    requests++
    return route.fulfill({
      contentType: "application/x-ndjson",
      body:
        requests === 1
          ? `${event("error", { code: "unavailable" })}\n`
          : `${event("delta", { text: "Recovered response" })}\n${event("done")}\n`,
    })
  })
  await page.goto("/?pipe=1250022871&segment=20")
  await page.getByRole("button", { name: ru.title, exact: true }).click()
  await page.getByRole("button", { name: ru.prompts.priority, exact: true }).click()
  await expect(page.getByRole("alert")).toContainText(ru.unavailable)
  await page.getByRole("button", { name: ru.retry }).click()
  await expect(page.getByTestId("assistant-answer")).toContainText("Recovered response")
})

for (const width of [375, 1440]) {
  test(`preserves draft and live conversation when docking at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/?pipe=1250009583&segment=3")
    await page.getByRole("button", { name: ru.title, exact: true }).click()
    await page.getByRole("button", { name: ru.prompts.neighbors, exact: true }).click()
    await expect(page.getByTestId("assistant-answer")).toContainText(/30.*40/)
    const input = page.getByRole("textbox", { name: ru.input })
    await input.fill("Draft question")
    await page.getByRole("button", { name: variants.workspace.moveChat }).click()
    await expect(input).toHaveValue("Draft question")
    await page.getByRole("button", { name: variants.workspace.minimizeChat }).click()
    await page.getByRole("button", { name: ru.title, exact: true }).first().click()
    await expect(input).toHaveValue("Draft question")
    await expect(page.getByTestId("assistant-answer")).toContainText(/30.*40/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
  })
}
