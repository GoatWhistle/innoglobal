import type { ReactNode } from "react"
import { useMediaQuery } from "@/shared/hooks"
import { FocusSummary } from "./summary/focus-summary"
import type { Variant, WorkspaceProps } from "./variant-types"
import styles from "./workspace-frame.module.css"

interface WorkspaceFrameProps {
  readonly kind: Variant
  readonly context: WorkspaceProps
  readonly comparisonDate?: string | null | undefined
  readonly children: ReactNode
  readonly aside: ReactNode
  readonly queue?: ReactNode
}
export function WorkspaceFrame({
  kind,
  children,
  aside,
  queue,
  context,
  comparisonDate,
}: WorkspaceFrameProps) {
  const narrow = useMediaQuery("(width < 48rem)")
  return (
    <div className={styles.frame} data-variant={kind} data-queue={Boolean(queue)}>
      {narrow ? <FocusSummary {...context} comparisonDate={comparisonDate} /> : null}
      {queue ? <div className={styles.queue}>{queue}</div> : null}
      <div className={styles.main}>{children}</div>
      <aside className={styles.aside}>{aside}</aside>
    </div>
  )
}
