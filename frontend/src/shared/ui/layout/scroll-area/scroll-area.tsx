import { clsx } from "clsx"
import type { HTMLAttributes } from "react"
import styles from "./scroll-area.module.css"

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  readonly axis?: "horizontal" | "vertical"
}

export function ScrollArea({ axis = "vertical", className, ...rest }: ScrollAreaProps) {
  return (
    <div
      {...rest}
      className={clsx(styles.area, axis === "horizontal" && styles.horizontal, className)}
    />
  )
}
