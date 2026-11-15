import { expect, test } from "@playwright/test"
import ru from "../src/shared/i18n/locales/ru/assistant.json" with { type: "json" }
import inspector from "../src/shared/i18n/locales/ru/inspector.json" with { type: "json" }
import pipe from "../src/shared/i18n/locales/ru/pipe.json" with { type: "json" }

const endpoint = "**/api/v1/assistant"
const event = (type: string, extra = {}) =>
  JSON.stringify({ type, text: "", code: "", actions: [], values: [], ...extra })

test("keeps frozen context and validates actions after a late response", async ({ page }) => {
  await page.goto("/?pipe=1250022871&segment=130")
  await expect(page.getByTestId("assistant-forecast")).toBeVisible()
  let finish: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  await page.route(endpoint, async (route) => {
    const input = route.request().postDataJSON()
    expect(input.context.segment_id).toBe(130)
    expect(input.context.snapshot_id).toBeTruthy()
    await gate
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: `${[
        event("delta", { text: "Segment 130 evidence" }),
        event("evidence", {
          actions: [
            { kind: "select", segment_ids: [130] },
            { kind: "source", segment_ids: [130], source: "segment" },
            { kind: "range", segment_ids: [129, 130, 131], from_m: 1290, to_m: 1320 },
          ],
        }),
        event("done"),
      ].join("\n")}\n`,
    })
  })
  await page.getByRole("button", { name: ru.prompts.priority, exact: true }).click()
  const input = page.getByRole("textbox", { name: pipe.restoration.coordinate })
  await input.fill("1310")
  await page.getByRole("button", { name: pipe.restoration.go, exact: true }).click()
  finish?.()
  await expect(page.getByTestId("assistant-answer")).toContainText("Segment 130 evidence")
  await expect(page).toHaveURL(/segment=131/)
  const answer = page.getByTestId("assistant-answer")
  await answer.getByRole("button", { name: ru.actions.source, exact: true }).click()
  await expect(page.getByRole("dialog", { name: ru.sourceTitle })).toContainText(
    inspector.title.replace("{{segment}}", "130"),
  )
  await page.keyboard.press("Escape")
  await answer.getByRole("button", { name: ru.actions.range, exact: true }).click()
  await expect(page).toHaveURL(/from=1290/)
  await expect(page.locator('[data-highlight="130"]').first()).toBeVisible()
  await page.getByRole("tab", { name: ru.data, exact: true }).click()
  await page.getByRole("tab", { name: ru.title, exact: true }).click()
  await expect(answer).toContainText("Segment 130 evidence")
  await page.getByRole("button", { name: ru.clear, exact: true }).click()
  await expect(page.locator("[data-highlight]")).toHaveCount(0)
})

test("handles unavailable provider, retry and stop", async ({ page }) => {
  await page.goto("/?pipe=1250022871&segment=130")
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: `${event("error", { code: "unavailable" })}\n`,
    }),
  )
  await page.getByRole("button", { name: ru.prompts.priority, exact: true }).click()
  await expect(page.getByRole("alert")).toContainText(ru.unavailable)
  await page.unroute(endpoint)
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: `${event("error", { code: "provider_unavailable" })}\n`,
    }),
  )
  await page.getByRole("button", { name: ru.retry }).click()
  await expect(page.getByRole("alert")).toContainText(ru.error)
  await page.unroute(endpoint)
  await page.route(endpoint, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.abort()
  })
  await page.getByRole("button", { name: ru.retry }).click()
  await page.getByRole("button", { name: ru.stop, exact: true }).click()
  await expect(page.getByTestId("assistant-answer")).toContainText(ru.stopped)
})

for (const width of [375, 1024, 1440]) {
  test(`fits ${width} with accessible mobile dialogue`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/?pipe=1250009583&segment=3")
    if (width === 375) await page.getByRole("button", { name: ru.open }).click()
    await expect(page.getByRole("textbox", { name: ru.input })).toBeVisible()
    await expect(page.getByTestId("assistant-forecast")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    if (width === 375) {
      await page.keyboard.press("Escape")
      await expect(page).toHaveURL(/segment=3/)
    }
  })
}

test("retries the selected older message with its original context", async ({ page }) => {
  const contexts: number[] = []
  await page.route(endpoint, async (route) => {
    contexts.push(route.request().postDataJSON().context.segment_id)
    const body =
      contexts.length < 3
        ? `${event("error", { code: "unavailable" })}\n`
        : `${event("delta", { text: "Retried original segment" })}\n${event("done")}\n`
    await route.fulfill({ contentType: "application/x-ndjson", body })
  })
  await page.goto("/?pipe=1250022871&segment=130")
  await page.getByRole("button", { name: ru.prompts.priority, exact: true }).click()
  await expect(page.getByRole("alert")).toBeVisible()
  await page.getByRole("textbox", { name: pipe.restoration.coordinate }).fill("1310")
  await page.getByRole("button", { name: pipe.restoration.go, exact: true }).click()
  await page.getByRole("button", { name: ru.prompts.neighbors, exact: true }).click()
  await expect(page.getByRole("alert")).toHaveCount(2)
  await page.getByTestId("assistant-answer").first().getByRole("button", { name: ru.retry }).click()
  await expect(page.getByTestId("assistant-answer").first()).toContainText(
    "Retried original segment",
  )
  await expect(page.getByTestId("assistant-answer").last()).toContainText(ru.prompts.neighbors)
  expect(contexts).toEqual([130, 131, 130])
  await expect(page).toHaveURL(/segment=131/)
})

test("expands the chat and preserves draft, conversation and scroll access", async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: `${event("delta", { text: "Detailed engineering response. ".repeat(100) })}\n${event("done")}\n`,
    }),
  )
  await page.goto("/?pipe=1250022871&segment=130")
  const input = page.getByRole("textbox", { name: ru.input })
  await input.fill("Original question")
  await page.getByRole("button", { name: ru.expand, exact: true }).click()
  const dialog = page.getByRole("dialog", { name: ru.title, exact: true })
  await expect(dialog).toBeVisible()
  expect((await dialog.boundingBox())?.width).toBeGreaterThanOrEqual(790)
  await expect(input).toHaveValue("Original question")
  await input.press("Enter")
  await expect(dialog.getByTestId("assistant-answer")).toContainText(
    "Detailed engineering response.",
  )
  await input.fill("Draft after response")
  await dialog.getByRole("log").evaluate((element) => {
    element.scrollTop = 0
  })
  await expect(input).toBeInViewport()
  await expect(dialog.getByTestId("assistant-forecast")).toBeInViewport()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: ru.expand, exact: true })).toBeVisible()
  await expect(input).toHaveValue("Draft after response")
  await expect(page.getByTestId("assistant-answer")).toContainText("Detailed engineering response.")
})
