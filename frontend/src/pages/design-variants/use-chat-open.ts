import { useState } from "react"

const KEY = "duppel-chat-open"

function readOpen(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) !== "false"
  } catch {
    return true
  }
}

export function useChatOpen(): readonly [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(readOpen)
  const change = (next: boolean) => {
    setOpen(next)
    try {
      globalThis.localStorage?.setItem(KEY, String(next))
    } catch {
      return
    }
  }
  return [open, change] as const
}
