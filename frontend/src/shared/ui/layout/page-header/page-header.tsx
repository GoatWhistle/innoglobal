import type { ReactNode } from "react"
import styles from "./page-header.module.css"

export interface PageHeaderProps {
  readonly title: string
  readonly eyebrow?: ReactNode
  readonly description?: ReactNode
  readonly actions?: ReactNode
}

export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow === undefined ? null : <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title} tabIndex={-1}>
          {title}
        </h1>
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
      </div>
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
