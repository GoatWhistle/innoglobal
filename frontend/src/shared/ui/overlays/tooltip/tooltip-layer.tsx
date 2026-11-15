import type { RefObject } from "react"
import { Kbd } from "../../primitives/kbd/kbd"
import { FloatingLayer } from "../floating-layer/floating-layer"
import styles from "./tooltip-layer.module.css"

export interface TooltipLayerProps {
  readonly id: string
  readonly anchor: RefObject<HTMLElement | null>
  readonly open: boolean
  readonly instant: boolean
  readonly content: string
  readonly shortcut?: string | undefined
}

export function TooltipLayer({ id, anchor, open, instant, content, shortcut }: TooltipLayerProps) {
  return (
    <FloatingLayer
      id={id}
      role="tooltip"
      anchor={anchor}
      open={open}
      instant={instant}
      align="center"
      prefer="top"
      gapToken="--space-8"
      className={styles.tooltip}
    >
      <span>{content}</span>
      {shortcut === undefined ? null : <Kbd className={styles.kbd}>{shortcut}</Kbd>}
    </FloatingLayer>
  )
}
