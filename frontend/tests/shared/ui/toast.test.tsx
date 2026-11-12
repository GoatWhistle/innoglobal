import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import ru from "@/shared/i18n/locales/ru/common.json"
import { type ToastApi, ToastProvider, useToast } from "@/shared/ui"

let api: ToastApi | null = null

function Capture() {
  api = useToast()
  return null
}

function renderToasts() {
  render(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  )
  return () => {
    if (api === null) throw new Error("toast api missing")
    return api
  }
}

describe("Toast", () => {
  it("lives in a named polite region and raises leaks as alerts", () => {
    const toasts = renderToasts()
    act(() => {
      toasts().show({ tone: "danger", title: "A1", text: "D1" })
      toasts().show({ title: "I1" })
    })
    const region = screen.getByRole("region", { name: ru.toast.region })
    expect(region.getAttribute("aria-live")).toBe("polite")
    expect(screen.getByRole("alert").textContent).toContain("A1")
    expect(region.textContent).toContain("I1")
  })

  it("leaves when the close button is pressed and unmounts after the exit animation", async () => {
    const toasts = renderToasts()
    act(() => {
      toasts().show({ title: "I1" })
    })
    await userEvent.click(screen.getByRole("button", { name: ru.toast.dismiss }))
    const card = screen.getByText("I1").closest("[data-tone]") as HTMLElement
    expect(card.hasAttribute("data-leaving")).toBe(true)
    fireEvent.animationEnd(card)
    expect(screen.queryByText("I1")).toBeNull()
  })

  it("dismisses itself when the countdown ends", () => {
    const toasts = renderToasts()
    act(() => {
      toasts().show({ title: "I1" })
    })
    const card = screen.getByText("I1").closest("[data-tone]") as HTMLElement
    const timer = card.lastElementChild as HTMLElement
    fireEvent.animationEnd(timer)
    expect(card.hasAttribute("data-leaving")).toBe(true)
  })
})
