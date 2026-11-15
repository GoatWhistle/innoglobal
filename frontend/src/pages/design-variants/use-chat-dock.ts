import { useState } from "react"

const OPEN_KEY = "duppel-chat-open"
const WIDTH_KEY = "duppel-chat-width"
export const CHAT_MIN = 320
export const CHAT_MAX = 680
const CHAT_DEFAULT = 416

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    return
  }
}

export const clampWidth = (value: number) =>
  Math.round(Math.min(CHAT_MAX, Math.max(CHAT_MIN, value)))

export function useChatDock() {
  const [open, setOpenState] = useState(() => read(OPEN_KEY) !== "false")
  const [width, setWidthState] = useState(() => clampWidth(Number(read(WIDTH_KEY)) || CHAT_DEFAULT))
  const setOpen = (next: boolean) => {
    setOpenState(next)
    write(OPEN_KEY, String(next))
  }
  const setWidth = (next: number) => {
    const value = clampWidth(next)
    setWidthState(value)
    write(WIDTH_KEY, String(value))
  }
  return { open, setOpen, width, setWidth }
}
