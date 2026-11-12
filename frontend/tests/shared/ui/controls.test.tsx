import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { createI18n, LocaleProvider } from "@/shared/i18n"
import ru from "@/shared/i18n/locales/ru/common.json"
import {
  Banner,
  Checkbox,
  CloseButton,
  Icon,
  IconButton,
  StatusBadge,
  Switch,
  type TabItem,
  Tabs,
} from "@/shared/ui"

type Section = "scene" | "profile" | "report" | "log"

const SECTIONS: readonly TabItem<Section>[] = [
  { value: "scene", label: "S1" },
  { value: "profile", label: "S2" },
  { value: "report", label: "S3", disabled: true },
  { value: "log", label: "S4", count: 2, alarm: true },
]

function TabsProbe() {
  const [value, setValue] = useState<Section>("scene")
  return (
    <Tabs label="T1" items={SECTIONS} value={value} onChange={setValue}>
      {value}
    </Tabs>
  )
}

describe("Icon", () => {
  it("is decorative by default and an image when labelled", () => {
    const { container } = render(<Icon name="leak" />)
    expect(container.querySelector('[data-icon="leak"]')?.getAttribute("aria-hidden")).toBe("true")
    render(<Icon name="valve" label="V1" />)
    expect(screen.getByRole("img", { name: "V1" })).toBeTruthy()
  })
})

describe("IconButton and CloseButton", () => {
  it("names the button and shows the label as a tooltip on keyboard focus", async () => {
    render(<IconButton icon="layers" label="L1" shortcut="L" />)
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "L1" })).toBe(document.activeElement)
    expect(screen.getByRole("tooltip").textContent).toContain("L1")
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  it("closes with the dictionary label", async () => {
    const close = vi.fn()
    render(<CloseButton onClick={close} />)
    await userEvent.click(screen.getByRole("button", { name: ru.action.close }))
    expect(close).toHaveBeenCalledOnce()
  })
})

describe("Checkbox and Switch", () => {
  it("reports a mixed state and toggles", async () => {
    const change = vi.fn()
    render(<Checkbox label="C1" checked={false} indeterminate onChange={change} />)
    const box = screen.getByRole("checkbox", { name: "C1" }) as HTMLInputElement
    expect(box.indeterminate).toBe(true)
    await userEvent.click(box)
    expect(change).toHaveBeenCalledWith(true)
  })

  it("ignores toggles while the server confirms", async () => {
    const change = vi.fn()
    render(<Switch label="W1" checked={false} pending onChange={change} />)
    const toggle = screen.getByRole("switch", { name: "W1" })
    expect(toggle.closest("label")?.getAttribute("aria-busy")).toBe("true")
    await userEvent.click(toggle)
    expect(change).not.toHaveBeenCalled()
  })
})

describe("Tabs", () => {
  it("moves with arrows, skips disabled tabs and wraps", async () => {
    render(
      <LocaleProvider instance={createI18n("ru")}>
        <TabsProbe />
      </LocaleProvider>,
    )
    await userEvent.tab()
    expect(screen.getByRole("tab", { name: "S1" })).toBe(document.activeElement)
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")
    const last = screen.getByRole("tab", { name: /S4/ })
    expect(last.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tabpanel").textContent).toBe("log")
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "S1" }).getAttribute("aria-selected")).toBe("true")
    await userEvent.keyboard("{End}")
    expect(last.getAttribute("aria-selected")).toBe("true")
  })
})

describe("StatusBadge and Banner", () => {
  it("always pairs the status word with an icon", () => {
    const { container } = render(<StatusBadge tone="danger" label="B1" />)
    expect(screen.getByText("B1")).toBeTruthy()
    expect(container.querySelector('[data-icon="alarm"]')).not.toBeNull()
  })

  it("announces a leak banner as an alert and dismisses it", async () => {
    const dismiss = vi.fn()
    render(
      <Banner tone="danger" title="N1" onDismiss={dismiss}>
        D1
      </Banner>,
    )
    expect(screen.getByRole("alert").textContent).toContain("N1")
    await userEvent.click(screen.getByRole("button", { name: ru.action.close }))
    expect(dismiss).toHaveBeenCalledOnce()
  })
})
