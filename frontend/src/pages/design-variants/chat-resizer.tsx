import { useRef } from "react"
import { useTranslation } from "@/shared/i18n"
import { CHAT_MAX, CHAT_MIN } from "./use-chat-dock"
import styles from "./workspace-shell.module.css"

const STEP = 24

export interface ChatResizerProps {
  readonly width: number
  readonly onResize: (width: number) => void
}

export function ChatResizer({ width, onResize }: ChatResizerProps) {
  const { t } = useTranslation()
  const start = useRef<{ x: number; width: number } | null>(null)
  return (
    <hr
      className={styles.resizer}
      aria-orientation="vertical"
      aria-label={t("assistant:resize")}
      aria-valuemin={CHAT_MIN}
      aria-valuemax={CHAT_MAX}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, width }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (start.current) onResize(start.current.width + start.current.x - event.clientX)
      }}
      onPointerUp={() => {
        start.current = null
      }}
      onPointerCancel={() => {
        start.current = null
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onResize(width + STEP)
        else if (event.key === "ArrowRight") onResize(width - STEP)
        else return
        event.preventDefault()
      }}
    />
  )
}
