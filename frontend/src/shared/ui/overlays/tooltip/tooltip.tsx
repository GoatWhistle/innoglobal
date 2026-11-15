import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./tooltip.module.css"
import { TooltipLayer } from "./tooltip-layer"
import { useTooltip } from "./use-tooltip"

export interface TooltipProps {
  readonly content: string
  readonly shortcut?: string | undefined
  readonly focusable?: boolean
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function Tooltip({
  content,
  shortcut,
  focusable = false,
  className,
  children,
}: TooltipProps) {
  const tip = useTooltip<HTMLSpanElement>()
  return (
    <>
      <span
        ref={tip.anchorRef}
        className={clsx(styles.anchor, className)}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={tip.open ? tip.id : undefined}
        {...tip.triggerProps}
      >
        {children}
      </span>
      <TooltipLayer
        id={tip.id}
        anchor={tip.anchorRef}
        open={tip.open}
        instant={tip.instant}
        content={content}
        shortcut={shortcut}
      />
    </>
  )
}
