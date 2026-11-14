import { clsx } from "clsx"
import { useEffect } from "react"
import { NavLink, useLocation } from "react-router"
import { readSelectedPipe, rememberSelectedPipe } from "@/entities/pipe"
import { type MessageKey, useTranslation } from "@/shared/i18n"
import { Icon, type IconName, ScrollArea } from "@/shared/ui"
import styles from "./app-nav.module.css"

interface NavItem {
  readonly to: string
  readonly label: MessageKey
  readonly icon: IconName
  readonly end?: boolean
}

const ITEMS: readonly NavItem[] = [
  { to: "/", label: "common:nav.overview", icon: "layers", end: true },
  { to: "/pipes", label: "common:nav.pipes", icon: "pipe" },
  { to: "/priorities", label: "common:nav.priorities", icon: "warning" },
  { to: "/data", label: "common:nav.data", icon: "journal" },
  { to: "/model", label: "common:nav.model", icon: "chart" },
]

export function AppNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const match = /^\/pipes\/(\d+)/.exec(location.pathname)
  const pipeId = match ? Number(match[1]) : readSelectedPipe()
  useEffect(() => {
    if (pipeId !== null) rememberSelectedPipe(pipeId)
  }, [pipeId])
  const destination = (to: string) => {
    if (pipeId === null) return to
    if (to === "/pipes") return `/pipes/${pipeId}`
    if (to === "/priorities") return `/pipes/${pipeId}/priorities`
    return to
  }
  return (
    <nav className={styles.nav} aria-label={t("common:nav.label")}>
      <ScrollArea axis="horizontal">
        <ul className={styles.list}>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={destination(item.to)}
                end={item.to === "/pipes" || (item.end ?? false)}
                viewTransition
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                <Icon name={item.icon} size="control" />
                <span>{t(item.label)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </nav>
  )
}
