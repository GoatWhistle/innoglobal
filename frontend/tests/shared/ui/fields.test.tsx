import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { createI18n, LocaleProvider } from "@/shared/i18n"
import ru from "@/shared/i18n/locales/ru/common.json"
import { NumberField, Select, type SelectOption, TextField } from "@/shared/ui"

function NumberProbe({ initial }: { readonly initial: number | null }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <NumberField label="P1" value={value} onChange={setValue} min={0.5} max={12} step={0.1} />
      <output data-testid="value">{String(value)}</output>
    </>
  )
}

type Medium = "oil" | "fuel" | "water"

const MEDIA: readonly SelectOption<Medium>[] = [
  { value: "oil", label: "Oil" },
  { value: "fuel", label: "Fuel", disabled: true },
  { value: "water", label: "Water" },
]

function SelectProbe() {
  const [value, setValue] = useState<Medium | null>(null)
  return (
    <>
      <Select label="M1" options={MEDIA} value={value} onChange={setValue} placeholder="Pick" />
      <output data-testid="value">{String(value)}</output>
    </>
  )
}

describe("TextField", () => {
  it("labels the input and links the error message", () => {
    render(<TextField label="L1" error="E1" />)
    const input = screen.getByRole("textbox", { name: "L1" })
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText("E1").parentElement?.id)
  })
})

describe("NumberField", () => {
  it("steps with arrows and Shift, without native spinners", async () => {
    render(
      <LocaleProvider instance={createI18n("ru")}>
        <NumberProbe initial={6.4} />
      </LocaleProvider>,
    )
    const input = screen.getByRole("spinbutton", { name: "P1" })
    expect(input.getAttribute("type")).toBeNull()
    await userEvent.type(input, "{ArrowUp}")
    expect(screen.getByTestId("value").textContent).toBe("6.5")
    await userEvent.type(input, "{Shift>}{ArrowUp}{/Shift}")
    expect(screen.getByTestId("value").textContent).toBe("7.5")
  })

  it("commits a typed decimal comma on blur and clamps to the bounds", async () => {
    render(
      <LocaleProvider instance={createI18n("ru")}>
        <NumberProbe initial={null} />
      </LocaleProvider>,
    )
    const input = screen.getByRole("spinbutton", { name: "P1" })
    await userEvent.type(input, "14,2")
    fireEvent.blur(input)
    expect(screen.getByTestId("value").textContent).toBe("12")
    const increase = screen.getByRole("button", { name: ru.field.increase })
    expect((increase as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("Select", () => {
  it("opens from the keyboard, skips disabled options and returns focus", async () => {
    render(<SelectProbe />)
    const trigger = screen.getByRole("button", { name: /M1/ })
    trigger.focus()
    await userEvent.keyboard("{ArrowDown}")
    const listbox = screen.getByRole("listbox")
    expect(document.activeElement).toBe(listbox)
    await userEvent.keyboard("{ArrowDown}{Enter}")
    expect(screen.getByTestId("value").textContent).toBe("water")
    expect(document.activeElement).toBe(trigger)
  })

  it("closes on Escape without choosing", async () => {
    render(<SelectProbe />)
    await userEvent.click(screen.getByRole("button", { name: /M1/ }))
    expect(screen.getByRole("listbox")).toBeTruthy()
    await userEvent.keyboard("{Escape}")
    expect(screen.getByTestId("value").textContent).toBe("null")
    expect(screen.getByRole("button", { name: /M1/ }).getAttribute("aria-expanded")).toBe("false")
  })
})
