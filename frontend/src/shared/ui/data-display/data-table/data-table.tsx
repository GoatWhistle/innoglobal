import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./data-table.module.css"

export type DataTableDensity = "regular" | "compact"

const DENSITY_CLASS: Readonly<Record<DataTableDensity, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface DataTableProps {
  readonly label: string
  readonly head: ReactNode
  readonly children: ReactNode
  readonly density?: DataTableDensity
  readonly className?: string | undefined
}

export function DataTable({
  label,
  head,
  children,
  density = "regular",
  className,
}: DataTableProps) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable table must be keyboard reachable
    <section className={clsx(styles.scroll, className)} tabIndex={0}>
      <table aria-label={label} className={clsx(styles.table, DENSITY_CLASS[density])}>
        <thead>{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  )
}
