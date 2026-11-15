import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AssistantComposer } from "@/features/engineering-assistant"
import { createI18n, LocaleProvider } from "@/shared/i18n"
import ru from "@/shared/i18n/locales/ru/assistant.json"

function renderComposer(busy: boolean) {
  const onSend = vi.fn()
  const onStop = vi.fn()
  render(
    <LocaleProvider instance={createI18n("ru")}>
      <AssistantComposer busy={busy} onSend={onSend} onStop={onStop} />
    </LocaleProvider>,
  )
  return { onSend, onStop }
}

describe("AssistantComposer", () => {
  it("sends on Enter and keeps Shift+Enter as a new line", async () => {
    const { onSend } = renderComposer(false)
    const input = screen.getByLabelText(ru.input)
    await userEvent.type(input, "Where thin{Shift>}{Enter}{/Shift}wall")
    expect(onSend).not.toHaveBeenCalled()
    await userEvent.type(input, "{Enter}")
    expect(onSend).toHaveBeenCalledWith("Where thin\nwall")
    expect((input as HTMLTextAreaElement).value).toBe("")
  })

  it("offers stop while an answer streams", async () => {
    const { onStop } = renderComposer(true)
    await userEvent.click(screen.getByRole("button", { name: ru.stop }))
    expect(onStop).toHaveBeenCalled()
  })
})
