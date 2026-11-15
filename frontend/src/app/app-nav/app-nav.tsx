import { clsx } from "clsx"
import { NavLink } from "react-router"
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
  { to: "/", label: "common:nav.pipes", icon: "pipe", end: true },
  { to: "/data", label: "common:nav.data", icon: "journal" },
  { to: "/model", label: "common:nav.model", icon: "chart" },
]

export function AppNav() {
  const { t } = useTranslation()
  return (
    <nav className={styles.nav} aria-label={t("common:nav.label")}>
      <ScrollArea axis="horizontal">
        <ul className={styles.list}>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
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
