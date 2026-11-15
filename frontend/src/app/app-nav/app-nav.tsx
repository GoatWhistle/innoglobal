import { clsx } from "clsx"
import { NavLink, useLocation } from "react-router"
import { type MessageKey, useTranslation } from "@/shared/i18n"
import { useSlidingIndicator } from "@/shared/motion"
import { ScrollArea } from "@/shared/ui"
import styles from "./app-nav.module.css"

interface NavItem {
  readonly to: string
  readonly label: MessageKey
  readonly end?: boolean
}

const ITEMS: readonly NavItem[] = [
  { to: "/", label: "common:nav.pipes", end: true },
  { to: "/assistant", label: "common:nav.assistant" },
  { to: "/dashboards", label: "assistant:dashboards" },
  { to: "/data", label: "common:nav.data" },
  { to: "/model", label: "common:nav.model" },
]

function activeItem(pathname: string): string {
  const match = ITEMS.find((item) =>
    item.end === true ? pathname === item.to : pathname.startsWith(item.to),
  )
  return match?.to ?? ""
}

export function AppNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = activeItem(pathname)
  const { listRef, indicatorRef, itemRef } = useSlidingIndicator<HTMLDivElement>(active, {
    radiusToken: "--radius-none",
  })
  return (
    <nav className={styles.nav} aria-label={t("common:nav.label")}>
      <ScrollArea axis="horizontal">
        <div ref={listRef} className={styles.track}>
          <ul className={styles.list}>
            {ITEMS.map((item) => (
              <li key={item.to} ref={itemRef(item.to)}>
                <NavLink
                  to={item.to}
                  end={item.end ?? false}
                  viewTransition
                  className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
                >
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ul>
          <span
            ref={indicatorRef}
            className={styles.ink}
            hidden={active === ""}
            aria-hidden="true"
          />
        </div>
      </ScrollArea>
    </nav>
  )
}
