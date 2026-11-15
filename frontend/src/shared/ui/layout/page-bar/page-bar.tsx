import type { ReactNode } from "react"
import { Link } from "react-router"
import { Icon } from "../../primitives/icon/icon"
import styles from "./page-bar.module.css"

export interface PageCrumb {
  readonly label: string
  readonly to: string
}

export interface PageBarProps {
  readonly label: string
  readonly crumbs: readonly PageCrumb[]
  readonly title: string
  readonly meta?: ReactNode
  readonly actions?: ReactNode
}

export function PageBar({ label, crumbs, title, meta, actions }: PageBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.identity}>
        <nav aria-label={label}>
          <ol className={styles.crumbs}>
            {crumbs.map((crumb) => (
              <li key={crumb.to}>
                <Link to={crumb.to} viewTransition className={styles.crumb}>
                  {crumb.label}
                </Link>
                <Icon name="chevron-right" size="sm" />
              </li>
            ))}
          </ol>
        </nav>
        <h1 className={styles.title}>{title}</h1>
        {meta === undefined ? null : <span className={styles.meta}>{meta}</span>}
      </div>
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
