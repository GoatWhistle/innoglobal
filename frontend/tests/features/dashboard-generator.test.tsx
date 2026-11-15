import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { DashboardGenerator } from "@/pages/dashboards/dashboard-generator"
import type { WidgetDraft } from "@/shared/api/widget-contract"
import copy from "@/shared/i18n/locales/ru/variants.json"

vi.mock("@/pages/dashboards/dashboard-widget", () => ({
  DashboardWidget: () => <div data-testid="preview" />,
}))
it("refines a preview, saves a reusable definition and adds the same definition only once", async () => {
  const draft: WidgetDraft = {
    version: 1,
    kind: "forecast",
    title: "Initial",
    description: "Profile",
    source: "agent",
    sourceId: "profile",
    unit: "mm",
  }
  const generate = vi
    .fn()
    .mockResolvedValueOnce(draft)
    .mockResolvedValueOnce({ ...draft, title: "Refined" })
  const onAdd = vi.fn(),
    onSave = vi.fn()
  render(
    <DashboardGenerator
      context={{ snapshotId: "one", pipeId: 1, segment: 0, from: 0, to: 10, baseline: "nominal" }}
      workspace={{} as WorkspaceProps}
      port={{ available: true, generate }}
      onAdd={onAdd}
      onSave={onSave}
    />,
  )
  fireEvent.change(screen.getByRole("textbox", { name: copy.dash.prompt }), {
    target: { value: "Compare profile" },
  })
  fireEvent.click(screen.getByRole("button", { name: copy.dash.generate }))
  await screen.findByTestId("preview")
  expect(onAdd).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: copy.dash.refine }))
  await screen.findByDisplayValue("Refined")
  fireEvent.click(screen.getByRole("button", { name: copy.dash.saveLibrary }))
  expect(onSave).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: copy.dash.add }))
  fireEvent.click(screen.getByRole("button", { name: copy.dash.added }))
  expect(onAdd).toHaveBeenCalledTimes(1)
  expect(onAdd.mock.calls[0]?.[0]).toEqual(onSave.mock.calls[0]?.[0])
  expect(generate.mock.calls[1]?.[0].previousDraft.title).toBe("Initial")
})
